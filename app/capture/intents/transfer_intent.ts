import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import { cutSpans, extractAmount, extractPastDate } from '#capture/extractors'
import {
  amountField,
  dateField,
  hasOverride,
  isoDate,
  pick,
  read,
  selectField,
} from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import { INCOME_KEYWORDS } from '#capture/intents/income_intent'
import AccountService from '#domains/budget/services/account_service'
import TransactionService from '#domains/budget/services/transaction_service'
import { fromIsoDate, now, today } from '#support/dates'
import { formatAmount, formatDate } from '#support/format'
import type { CaptureOverrides } from '#shared/types/capture'

const KEYWORDS = ['virement', 'vire', 'virer', 'transfert', 'transferer', 'transfere']

const FROM_WORDS = new Set(['de', 'du', 'depuis', 'des'])
const TO_WORDS = new Set(['vers', 'sur', 'au', 'a', 'pour', 'dans'])

export type ParsedTransfer = {
  amountCents: number | null
  occurredOn: DateTime | null
  fromId: number | null
  toId: number | null
}

/**
 * Finds the accounts named in the phrase; « de / du / depuis » marks the
 * source, « vers / sur / au » the destination. A single account without
 * direction is the destination.
 */
export function parseTransfer(
  raw: string,
  accounts: Array<{ id: number; name: string }>,
  reference: DateTime = now()
): ParsedTransfer {
  const amount = extractAmount(raw)
  const withoutAmount = amount ? cutSpans(raw, [amount]) : raw
  const date = extractPastDate(withoutAmount, reference)
  const rest = ` ${normalize(date ? cutSpans(withoutAmount, [date]) : withoutAmount)} `

  let fromId: number | null = null
  let toId: number | null = null
  const loose: number[] = []
  const found = accounts
    .map((account) => ({ account, key: normalize(account.name) }))
    .filter(({ key }) => key !== '' && rest.includes(` ${key} `))
    .sort((a, b) => b.key.length - a.key.length)

  /**
   * « livret » for « Livret A »: a distinctive word of at least 4 letters
   * that names a single account is enough.
   */
  for (const account of accounts) {
    if (found.some((entry) => entry.account.id === account.id)) continue
    for (const word of normalize(account.name).split(' ')) {
      if (word.length < 4) continue
      const owners = accounts.filter((other) => normalize(other.name).split(' ').includes(word))
      if (owners.length === 1 && rest.includes(` ${word} `)) {
        found.push({ account, key: word })
        break
      }
    }
  }

  for (const { account, key } of found) {
    /**
     * The closest direction word before the name decides (« depuis
     * épargne vers compte courant »: « vers » for the second account).
     */
    const before = rest
      .slice(0, rest.indexOf(` ${key} `))
      .trim()
      .split(' ')
      .slice(-3)
      .reverse()
    const direction = before.find((word) => FROM_WORDS.has(word) || TO_WORDS.has(word))
    if (direction && FROM_WORDS.has(direction) && fromId === null) fromId = account.id
    else if (direction && TO_WORDS.has(direction) && toId === null) toId = account.id
    else loose.push(account.id)
  }
  for (const id of loose) {
    if (toId === null && id !== fromId) toId = id
    else if (fromId === null && id !== toId) fromId = id
  }

  return {
    amountCents: amount?.cents ?? null,
    occurredOn: date?.date ?? null,
    fromId,
    toId,
  }
}

/**
 * « virement 200 € vers le livret », « vire 300 € du courant sur
 * l'épargne » → a transfer between two accounts.
 */
@inject()
export default class TransferIntent implements CaptureIntent {
  info = { name: 'transfer', label: 'Virement', domain: 'budget' } as const
  keywords = KEYWORDS

  constructor(
    private accounts: AccountService,
    private transactions: TransactionService
  ) {}

  /**
   * « virement reçu » is an income, not a transfer between own accounts.
   */
  score(input: NormalizedInput): number {
    if (matchedKeywords(input, this.keywords).length === 0) return 0
    if (matchedKeywords(input, INCOME_KEYWORDS).length > 0) return 0.2
    return extractAmount(input.raw) ? 0.85 : 0.5
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }
    const { amountCents, occurredOn, fromAccountId, toAccountId } = draft.data
    const [from, to] = await Promise.all([
      this.accounts.detail(fromAccountId!),
      this.accounts.detail(toAccountId!),
    ])
    return {
      status: 'ready',
      intent: this.info,
      fields: draft.fields,
      missing: [],
      effects: [
        {
          domain: 'budget',
          title: `Virement de ${formatAmount(amountCents!)} · ${from.name} → ${to.name}`,
          detail: `${formatDate(fromIsoDate(occurredOn))} · ni dépense ni entrée`,
        },
        {
          domain: 'budget',
          title: `${from.name} : ${formatAmount(from.balanceCents)} → ${formatAmount(from.balanceCents - amountCents!)}`,
        },
        {
          domain: 'budget',
          title: `${to.name} : ${formatAmount(to.balanceCents)} → ${formatAmount(to.balanceCents + amountCents!)}`,
        },
      ],
    }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      throw new Exception(`Saisie incomplète : ${draft.missing.join(', ')}`, { status: 422 })
    }
    const { amountCents, occurredOn, fromAccountId, toAccountId } = draft.data
    const transfer = await this.transactions.transfer(
      {
        amountCents: amountCents!,
        occurredOn,
        fromAccountId: fromAccountId!,
        toAccountId: toAccountId!,
      },
      trx,
      { captureText: input.original }
    )
    return {
      message: `Virement de ${formatAmount(amountCents!)} enregistré`,
      created: [{ type: 'transfer' as const, id: transfer.id }],
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const [accounts, defaultAccount] = await Promise.all([
      this.accounts.list(),
      this.accounts.defaultAccount(),
    ])
    const parsed = parseTransfer(input.raw, accounts)

    const amount = pick(overrides, 'amountCents', parsed.amountCents, read.cents)
    const occurredOn = pick(
      overrides,
      'occurredOn',
      isoDate(parsed.occurredOn ?? today()),
      (value) => read.isoDate(value) ?? isoDate(today())
    )
    const fallbackFrom =
      parsed.fromId ??
      (defaultAccount && defaultAccount.id !== parsed.toId ? defaultAccount.id : null)
    const fromOverridden = hasOverride(overrides, 'fromAccountId')
    const toOverridden = hasOverride(overrides, 'toAccountId')
    const fromAccountId = fromOverridden ? read.id(overrides.fromAccountId ?? null) : fallbackFrom
    const toAccountId = toOverridden ? read.id(overrides.toAccountId ?? null) : parsed.toId

    const missing: string[] = []
    if (amount.value === null || amount.value <= 0) missing.push('Montant')
    if (!fromAccountId) missing.push('Depuis')
    if (!toAccountId) missing.push('Vers')
    if (fromAccountId && fromAccountId === toAccountId) missing.push('Deux comptes différents')

    const options = [
      { value: null, label: '—' },
      ...accounts.map(({ id, name }) => ({ value: id, label: name })),
    ]
    return {
      data: { amountCents: amount.value, occurredOn: occurredOn.value, fromAccountId, toAccountId },
      missing,
      fields: [
        amountField(
          'amountCents',
          'Montant',
          amount.value,
          amount.overridden,
          parsed.amountCents !== null
        ),
        selectField(
          'fromAccountId',
          'Depuis',
          fromAccountId,
          options,
          fromOverridden
            ? 'override'
            : parsed.fromId
              ? 'matched'
              : fromAccountId
                ? 'default'
                : 'empty',
          true
        ),
        selectField(
          'toAccountId',
          'Vers',
          toAccountId,
          options,
          toOverridden ? 'override' : toAccountId ? 'matched' : 'empty',
          true
        ),
        dateField(
          'occurredOn',
          'Date',
          occurredOn.value,
          occurredOn.overridden,
          !!parsed.occurredOn
        ),
      ],
    }
  }
}
