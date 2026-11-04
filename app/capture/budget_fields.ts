import { inject } from '@adonisjs/core'
import { hasOverride, read, selectField } from '#capture/fields'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import { formatAmount } from '#support/format'
import { today, fromIsoDate } from '#support/dates'
import type { CaptureEffect, CaptureField, CaptureOverrides } from '#shared/types/capture'

export type BudgetChoice = {
  envelopeId: number | null
  accountId: number | null
  /** Envelope found from the text, before corrections (for learning). */
  matchedEnvelopeId: number | null
  envelopeOverridden: boolean
  fields: CaptureField[]
}

/**
 * Envelope and account fields, shared by every intent that spends money
 * (expense, bill, fuel, subscription).
 */
@inject()
export default class BudgetFields {
  constructor(
    private envelopes: EnvelopeService,
    private accounts: AccountService
  ) {}

  /**
   * `hint` is the text used to find the envelope (« carburant plein »,
   * « facture edf »…), already normalized.
   */
  async resolve(hint: string, overrides: CaptureOverrides): Promise<BudgetChoice> {
    const [envelopes, accounts, matched, defaultAccount] = await Promise.all([
      this.envelopes.list(),
      this.accounts.list(),
      this.envelopes.match(hint),
      this.accounts.defaultAccount(),
    ])

    const envelopeOverridden = hasOverride(overrides, 'envelopeId')
    const accountOverridden = hasOverride(overrides, 'accountId')
    const matchedEnvelopeId = matched?.id ?? null
    const envelopeId = envelopeOverridden
      ? read.id(overrides.envelopeId ?? null)
      : matchedEnvelopeId
    const accountId = accountOverridden
      ? read.id(overrides.accountId ?? null)
      : (defaultAccount?.id ?? null)

    return {
      envelopeId,
      accountId,
      matchedEnvelopeId,
      envelopeOverridden,
      fields: [
        selectField(
          'envelopeId',
          'Enveloppe',
          envelopeId,
          [{ value: null, label: 'Sans enveloppe' }, ...envelopes.map(toOption)],
          envelopeOverridden ? 'override' : envelopeId ? 'matched' : 'empty'
        ),
        selectField(
          'accountId',
          'Compte',
          accountId,
          [{ value: null, label: 'Aucun compte' }, ...accounts.map(toOption)],
          accountOverridden ? 'override' : accountId ? 'default' : 'empty'
        ),
      ],
    }
  }

  /**
   * Effects of spending `amountCents` on `occurredOn`: envelope progress
   * (for the current month) and account balance.
   */
  async effects(
    choice: Pick<BudgetChoice, 'envelopeId' | 'accountId'>,
    amountCents: number,
    occurredOn: string
  ): Promise<CaptureEffect[]> {
    const effects: CaptureEffect[] = []

    if (choice.envelopeId && fromIsoDate(occurredOn).hasSame(today(), 'month')) {
      const envelope = await this.envelopes.detail(choice.envelopeId)
      if (envelope.monthlyBudgetCents > 0) {
        const spent = envelope.spentCents + amountCents
        const left = envelope.monthlyBudgetCents - spent
        effects.push({
          domain: 'budget',
          title: `${envelope.name} : ${formatAmount(spent)} sur ${formatAmount(envelope.monthlyBudgetCents)}`,
          detail:
            left >= 0
              ? `Reste ${formatAmount(left)} ce mois-ci`
              : `Dépassement de ${formatAmount(-left)}`,
          tone: left >= 0 ? 'default' : 'warning',
        })
      }
    }

    if (choice.accountId) {
      const account = await this.accounts.detail(choice.accountId)
      effects.push({
        domain: 'budget',
        title: `${account.name} : ${formatAmount(account.balanceCents)} → ${formatAmount(account.balanceCents - amountCents)}`,
      })
    }

    return effects
  }

  async envelopeName(id: number | null): Promise<string | null> {
    if (!id) return null
    const envelope = await this.envelopes.detail(id)
    return envelope.name
  }
}

function toOption({ id, name }: { id: number; name: string }) {
  return { value: id, label: name }
}
