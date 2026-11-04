import { type DateTime } from 'luxon'
import type { Status } from '#shared/types/domain'

/**
 * A notice deadline becomes « à prévoir » this many days ahead; it is
 * also when the reminder task appears.
 */
export const NOTICE_WINDOW_DAYS = 30

export type ContractTerms = {
  commitmentUntil: DateTime | null
  tacitRenewal: boolean
  renewalMonths: number | null
  noticeDays: number | null
  endedOn: DateTime | null
}

/**
 * End of the current term and the last day to give notice.
 *
 * A tacitly renewed contract rolls its term forward until the notice
 * deadline is not past: once it is too late, the next term is the one
 * that matters. Without renewal, a commitment already over leaves no
 * deadline.
 */
export function currentTerm(
  contract: ContractTerms,
  today: DateTime
): { endsOn: DateTime; noticeBy: DateTime } | null {
  if (contract.endedOn || !contract.commitmentUntil) return null
  const notice = contract.noticeDays ?? 0
  let endsOn = contract.commitmentUntil
  if (contract.tacitRenewal && contract.renewalMonths) {
    while (endsOn.minus({ days: notice }) < today) {
      endsOn = endsOn.plus({ months: contract.renewalMonths })
    }
  } else if (endsOn < today) {
    return null
  }
  return { endsOn, noticeBy: endsOn.minus({ days: notice }) }
}

export function contractStatus(contract: ContractTerms, today: DateTime): Status {
  if (contract.endedOn) return 'done'
  const term = currentTerm(contract, today)
  if (!term) return 'planned'
  if (term.noticeBy < today) return 'overdue'
  if (term.noticeBy <= today.plus({ days: NOTICE_WINDOW_DAYS })) return 'upcoming'
  return 'planned'
}
