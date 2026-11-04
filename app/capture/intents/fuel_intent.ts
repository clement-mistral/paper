import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import BudgetFields from '#capture/budget_fields'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import {
  cutSpans,
  extractAmount,
  extractKm,
  extractLiters,
  extractPastDate,
} from '#capture/extractors'
import {
  amountField,
  dateField,
  hasOverride,
  isoDate,
  numberField,
  pick,
  read,
  selectField,
} from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import FuelService from '#domains/auto/services/fuel_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import { fuelValidator } from '#domains/auto/validators/fuel'
import { fromIsoDate, now, today } from '#support/dates'
import { formatAmount, formatDate, formatKm, formatLiters, formatNumber } from '#support/format'
import type { Fuel } from '#shared/types/auto'
import type { CaptureEffect, CaptureOverrides } from '#shared/types/capture'

const KEYWORDS = [
  'plein',
  'essence',
  'carburant',
  'gazole',
  'diesel',
  'station',
  'sp95',
  'sp98',
  'e10',
  'e85',
  'gpl',
]

/**
 * Fuel words in the text, to pick the compatible vehicle.
 */
const FUEL_WORDS: Array<[RegExp, Fuel[]]> = [
  [/\b(?:gazole|gasoil|diesel)\b/, ['diesel']],
  [/\bsp\s?98\b/, ['sp98']],
  [/\be\s?10\b/, ['e10', 'sp95']],
  [/\bsp\s?95\b/, ['sp95', 'e10']],
  [/\be\s?85\b|\bethanol\b/, ['e85']],
  [/\bgpl\b/, ['lpg']],
  [/\bessence\b/, ['sp95', 'sp98', 'e10', 'e85']],
]

export type ParsedFuel = {
  liters: number | null
  totalCents: number | null
  odometerKm: number | null
  filledOn: DateTime | null
  fuels: Fuel[] | null
  rest: string
}

/**
 * Pure extraction step of the fuel intent.
 */
export function parseFuel(raw: string, reference: DateTime = now()): ParsedFuel {
  const liters = extractLiters(raw)
  const km = extractKm(raw)
  const withoutUnits = cutSpans(
    raw,
    [liters, km].filter((span) => span !== null)
  )
  const amount = extractAmount(withoutUnits)
  const withoutAmount = amount ? cutSpans(withoutUnits, [amount]) : withoutUnits
  const date = extractPastDate(withoutAmount, reference)
  const rest = date ? cutSpans(withoutAmount, [date]) : withoutAmount

  const text = normalize(raw)
  const fuels = FUEL_WORDS.find(([pattern]) => pattern.test(text))?.[1] ?? null

  return {
    liters: liters?.liters ?? null,
    totalCents: amount?.cents ?? null,
    odometerKm: km?.km ?? null,
    filledOn: date?.date ?? null,
    fuels,
    rest,
  }
}

/**
 * « plein 38 L 67 € », « gazole 45,2 L 78,90 € 142 380 km » → a fuel log
 * on the vehicle, its odometer and a « Carburant » expense in Budget.
 */
@inject()
export default class FuelIntent implements CaptureIntent {
  info = { name: 'fuel', label: 'Plein', domain: 'auto' } as const
  keywords = KEYWORDS

  constructor(
    private budget: BudgetFields,
    private vehicles: VehicleService,
    private fuel: FuelService
  ) {}

  score(input: NormalizedInput): number {
    let score = 0
    if (matchedKeywords(input, this.keywords).length > 0) score += 0.6
    if (extractLiters(input.raw)) score += 0.4
    if (extractAmount(input.raw)) score += 0.2
    return Math.min(score, 1)
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }

    const { liters, totalCents, odometerKm, filledOn } = draft.data
    const pricePerLiter = totalCents! / 100 / liters!
    const effects: CaptureEffect[] = [
      {
        domain: 'auto',
        title: `Plein ${draft.vehicle!.name} · ${formatLiters(liters!)} · ${formatAmount(totalCents!)}`,
        detail: `${formatNumber(Math.round(pricePerLiter * 1000) / 1000)} €/L · ${formatDate(fromIsoDate(filledOn))}`,
      },
    ]

    if (odometerKm !== null) {
      const current = await this.vehicles.odometer(draft.vehicle!.id)
      effects.push(
        odometerKm >= current
          ? {
              domain: 'auto',
              title: `Compteur : ${formatKm(current)} → ${formatKm(odometerKm)}`,
              detail: `+${formatKm(odometerKm - current)}`,
            }
          : {
              domain: 'auto',
              title: `Compteur inférieur au dernier relevé (${formatKm(current)})`,
              detail: 'Vérifiez le kilométrage',
              tone: 'warning',
            }
      )
    }

    effects.push(
      { domain: 'budget', title: `Dépense de ${formatAmount(totalCents!)} · Carburant` },
      ...(await this.budget.effects(draft.budget, totalCents!, filledOn))
    )

    return { status: 'ready', intent: this.info, fields: draft.fields, missing: [], effects }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    const data = await fuelValidator.validate(draft.data)

    const log = await this.fuel.log(data, trx, {
      captureText: input.original,
      vehicleName: draft.vehicle!.name,
    })

    return {
      message: `Plein enregistré : ${formatLiters(data.liters)}, ${formatAmount(data.totalCents)}`,
      created: [{ type: 'fuel_log' as const, id: log.id }],
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseFuel(input.raw)
    const vehicles = await this.vehicles.all()

    /**
     * Named vehicle, else the only one, else the only one burning the
     * fuel named in the text.
     */
    const named = await this.vehicles.match(normalize(parsed.rest))
    let matchedId: number | null = named?.id ?? null
    if (matchedId === null && vehicles.length === 1) matchedId = vehicles[0].id
    if (matchedId === null && parsed.fuels) {
      const compatible = vehicles.filter((vehicle) => parsed.fuels!.includes(vehicle.fuel))
      if (compatible.length === 1) matchedId = compatible[0].id
    }

    const vehicleOverridden = hasOverride(overrides, 'vehicleId')
    const vehicleId = vehicleOverridden ? read.id(overrides.vehicleId ?? null) : matchedId
    const vehicle = vehicles.find(({ id }) => id === vehicleId) ?? null

    const liters = pick(overrides, 'liters', parsed.liters, read.number)
    const total = pick(overrides, 'totalCents', parsed.totalCents, read.cents)
    const odometer = pick(overrides, 'odometerKm', parsed.odometerKm, read.number)
    const filledOn = pick(
      overrides,
      'filledOn',
      isoDate(parsed.filledOn ?? today()),
      (value) => read.isoDate(value) ?? isoDate(today())
    )
    const budget = await this.budget.resolve('carburant essence plein', overrides)

    const missing: string[] = []
    if (!vehicle)
      missing.push(vehicles.length === 0 ? 'Véhicule (créez-le dans Fiches)' : 'Véhicule')
    if (liters.value === null || liters.value <= 0) missing.push('Litres')
    if (total.value === null || total.value <= 0) missing.push('Montant')

    return {
      data: {
        vehicleId: vehicle?.id ?? null,
        liters: liters.value,
        totalCents: total.value,
        odometerKm: odometer.value === null ? null : Math.round(odometer.value),
        filledOn: filledOn.value,
        envelopeId: budget.envelopeId,
        accountId: budget.accountId,
      },
      vehicle,
      budget,
      missing,
      fields: [
        selectField(
          'vehicleId',
          'Véhicule',
          vehicle?.id ?? null,
          [
            { value: null, label: 'Choisir…' },
            ...vehicles.map(({ id, name }) => ({ value: id, label: name })),
          ],
          vehicleOverridden ? 'override' : vehicle ? 'matched' : 'empty',
          true
        ),
        numberField('liters', 'Litres', liters.value, liters.overridden, {
          parsed: parsed.liters !== null,
          suffix: 'L',
        }),
        amountField(
          'totalCents',
          'Montant',
          total.value,
          total.overridden,
          parsed.totalCents !== null
        ),
        numberField('odometerKm', 'Compteur', odometer.value, odometer.overridden, {
          parsed: parsed.odometerKm !== null,
          suffix: 'km',
          required: false,
        }),
        dateField('filledOn', 'Date', filledOn.value, filledOn.overridden, !!parsed.filledOn),
        ...budget.fields,
      ],
    }
  }
}
