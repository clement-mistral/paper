import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, CaptureRef, IntentDraft } from '#capture/intent'
import { cutSpans, extractAmount, extractKm, extractPastDate } from '#capture/extractors'
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
import MaintenanceService from '#domains/auto/services/maintenance_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import { fromIsoDate, now, today } from '#support/dates'
import { formatAmount, formatDate, formatKm } from '#support/format'
import {
  MAINTENANCE_KINDS,
  MAINTENANCE_KIND_LABELS,
  type MaintenanceKind,
} from '#shared/types/auto'
import type { CaptureOverrides } from '#shared/types/capture'

/**
 * Words of a vehicle maintenance, with the kind they mean.
 */
const KIND_WORDS: Array<[RegExp, MaintenanceKind]> = [
  [/\bvidange\b/, 'oil_change'],
  [/\b(?:controle technique|ct)\b/, 'inspection'],
  [/\b(?:distribution|courroie)\b/, 'timing_belt'],
  [/\b(?:pneus?|parallelisme|equilibrage)\b/, 'tires'],
  [/\b(?:freins?|plaquettes?|disques?)\b/, 'brakes'],
  [/\bbatterie\b/, 'battery'],
  [/\b(?:revision|entretien)\b/, 'service'],
  [/\b(?:reparation|carrosserie|garage|pare ?brise)\b/, 'repair'],
]

const KEYWORDS = [
  'vidange',
  'revision',
  'entretien',
  'pneus',
  'pneu',
  'freins',
  'plaquettes',
  'distribution',
  'courroie',
  'batterie',
  'reparation',
  'carrosserie',
  'parallelisme',
]

/** « prévoir la vidange » is a task, not a maintenance done. */
const FUTURE = /\b(?:prevoir|faire|penser|programmer|prendre rdv|rdv|rendez vous|a faire)\b/

export type ParsedMaintenance = {
  kind: MaintenanceKind | null
  costCents: number | null
  odometerKm: number | null
  doneOn: DateTime | null
  rest: string
}

/**
 * Pure extraction step: kind, cost, mileage, day.
 */
export function parseMaintenance(raw: string, reference: DateTime = now()): ParsedMaintenance {
  const km = extractKm(raw)
  const withoutKm = km ? cutSpans(raw, [km]) : raw
  const amount = extractAmount(withoutKm)
  const withoutAmount = amount ? cutSpans(withoutKm, [amount]) : withoutKm
  const date = extractPastDate(withoutAmount, reference)
  const rest = date ? cutSpans(withoutAmount, [date]) : withoutAmount
  const normalized = normalize(rest)
  return {
    kind: KIND_WORDS.find(([pattern]) => pattern.test(normalized))?.[1] ?? null,
    costCents: amount?.cents ?? null,
    odometerKm: km?.km ?? null,
    doneOn: date?.date ?? null,
    rest,
  }
}

/**
 * « vidange 89 € 101 000 km », « contrôle technique 78 € hier » → a done
 * maintenance on the vehicle (completing the planned one of that kind),
 * its expense, and the next one when it is periodic.
 */
@inject()
export default class MaintenanceIntent implements CaptureIntent {
  info = { name: 'maintenance', label: 'Entretien véhicule', domain: 'auto' } as const
  keywords = KEYWORDS

  constructor(
    private vehicles: VehicleService,
    private maintenances: MaintenanceService
  ) {}

  score(input: NormalizedInput): number {
    const kind = KIND_WORDS.some(([pattern]) => pattern.test(input.text))
    if (!kind && matchedKeywords(input, this.keywords).length === 0) return 0
    const amount = extractAmount(input.raw)
    const km = extractKm(input.raw)
    /**
     * Without a cost or a mileage it is rather a task (« ranger le
     * garage », « prévoir la vidange »): stay below the task markers.
     */
    if (!amount?.explicit && !km) return 0.35
    if (FUTURE.test(input.text) && !amount) return 0.3
    return 0.75 + (amount ? 0.1 : 0) + (km ? 0.05 : 0)
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }
    const { kind, costCents, odometerKm, doneOn } = draft.data
    const label = MAINTENANCE_KIND_LABELS[kind!]
    const planned = await this.maintenances.plannedOfKind(draft.vehicle!.id, kind!)
    const effects: IntentDraft['effects'] = [
      {
        domain: 'auto',
        title: `${label} ${draft.vehicle!.name}${planned ? ' · entretien prévu marqué fait' : ''}`,
        detail: [formatDate(fromIsoDate(doneOn)), odometerKm ? formatKm(odometerKm) : null]
          .filter(Boolean)
          .join(' · '),
      },
    ]
    if (costCents) {
      effects.push({
        domain: 'budget',
        title: `Dépense de ${formatAmount(costCents)} · Entretien ${draft.vehicle!.name}`,
      })
    }
    if (planned?.intervalKm || planned?.intervalMonths) {
      effects.push({ domain: 'auto', title: 'Le prochain est prévu automatiquement' })
    }
    return { status: 'ready', intent: this.info, fields: draft.fields, missing: [], effects }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0 || !draft.vehicle) {
      throw new Exception(`Saisie incomplète : ${draft.missing.join(', ')}`, { status: 422 })
    }
    const { kind, costCents, odometerKm, doneOn } = draft.data
    const vehicle = draft.vehicle
    const planned = await this.maintenances.plannedOfKind(vehicle.id, kind!)
    const created: CaptureRef[] = []
    let next: { id: number } | null
    if (planned) {
      const result = await this.maintenances.complete(
        planned.id,
        {
          doneOn,
          odometerKm,
          costCents,
          envelopeId: planned.envelopeId,
          accountId: planned.accountId,
        },
        trx
      )
      created.push({ type: 'maintenance_completion', id: planned.id })
      next = result.next
    } else {
      const result = await this.maintenances.createDone(
        vehicle.id,
        { kind: kind!, doneOn, odometerKm, costCents },
        trx
      )
      created.push({ type: 'maintenance', id: result.maintenance.id })
      next = result.next
    }
    if (next) created.push({ type: 'maintenance', id: next.id })
    return {
      message: `${MAINTENANCE_KIND_LABELS[kind!]} ${vehicle.name} notée${costCents ? `, ${formatAmount(costCents)}` : ''}`,
      created,
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseMaintenance(input.raw)
    const vehicles = await this.vehicles.all()
    const named = await this.vehicles.match(normalize(parsed.rest))
    const matchedId = named?.id ?? (vehicles.length === 1 ? vehicles[0].id : null)
    const vehicleOverridden = hasOverride(overrides, 'vehicleId')
    const vehicleId = vehicleOverridden ? read.id(overrides.vehicleId ?? null) : matchedId
    const vehicle = vehicles.find(({ id }) => id === vehicleId) ?? null

    const kind = pick<MaintenanceKind | null>(overrides, 'kind', parsed.kind, (value) =>
      (MAINTENANCE_KINDS as readonly string[]).includes(String(value))
        ? (value as MaintenanceKind)
        : null
    )
    const cost = pick(overrides, 'costCents', parsed.costCents, read.cents)
    const km = pick(overrides, 'odometerKm', parsed.odometerKm, (value) => {
      const number = read.number(value)
      return number === null ? null : Math.round(number)
    })
    const doneOn = pick(
      overrides,
      'doneOn',
      isoDate(parsed.doneOn ?? today()),
      (value) => read.isoDate(value) ?? isoDate(today())
    )

    const missing: string[] = []
    if (!vehicle) missing.push('Véhicule')
    if (!kind.value) missing.push('Type')

    return {
      vehicle,
      data: { kind: kind.value, costCents: cost.value, odometerKm: km.value, doneOn: doneOn.value },
      missing,
      fields: [
        selectField(
          'vehicleId',
          'Véhicule',
          vehicleId,
          [
            { value: null, label: '—' },
            ...vehicles.map(({ id, name }) => ({ value: id, label: name })),
          ],
          vehicleOverridden ? 'override' : named ? 'matched' : vehicleId ? 'default' : 'empty',
          true
        ),
        selectField(
          'kind',
          'Type',
          kind.value,
          MAINTENANCE_KINDS.map((value) => ({ value, label: MAINTENANCE_KIND_LABELS[value] })),
          kind.overridden ? 'override' : parsed.kind ? 'parsed' : 'empty',
          true
        ),
        {
          ...amountField(
            'costCents',
            'Coût',
            cost.value,
            cost.overridden,
            parsed.costCents !== null
          ),
          required: false,
        },
        numberField('odometerKm', 'Compteur', km.value, km.overridden, {
          parsed: parsed.odometerKm !== null,
          suffix: 'km',
          required: false,
        }),
        dateField('doneOn', 'Date', doneOn.value, doneOn.overridden, !!parsed.doneOn),
      ],
    }
  }
}
