import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { contractStatus, currentTerm } from '#domains/maison/services/contract_terms'
import { HOME_ZONE } from '#support/dates'

const day = (iso: string) => DateTime.fromISO(iso, { zone: HOME_ZONE }).startOf('day')
const iso = (value: DateTime | undefined) => value?.toISODate()

const base = {
  commitmentUntil: null,
  tacitRenewal: false,
  renewalMonths: null,
  noticeDays: null,
  endedOn: null,
}

test.group('Maison | contract terms', () => {
  const today = day('2026-11-04')

  test('a commitment to come gives its notice deadline', ({ assert }) => {
    const term = currentTerm({ ...base, commitmentUntil: day('2027-03-01'), noticeDays: 30 }, today)
    assert.equal(iso(term?.endsOn), '2027-03-01')
    assert.equal(iso(term?.noticeBy), '2027-01-30')
  })

  test('a tacit renewal rolls the term once the notice is past', ({ assert }) => {
    const contract = {
      ...base,
      commitmentUntil: day('2025-11-20'),
      tacitRenewal: true,
      renewalMonths: 12,
      noticeDays: 30,
    }
    // 2026-11-20 minus 30 days is already past: the next term matters.
    const term = currentTerm(contract, today)
    assert.equal(iso(term?.endsOn), '2027-11-20')
    assert.equal(iso(term?.noticeBy), '2027-10-21')
    assert.equal(contractStatus(contract, today), 'planned')
  })

  test('without renewal, a past commitment leaves no deadline', ({ assert }) => {
    const contract = { ...base, commitmentUntil: day('2026-01-01'), noticeDays: 30 }
    assert.isNull(currentTerm(contract, today))
    assert.equal(contractStatus(contract, today), 'planned')
  })

  test('status follows the notice deadline', ({ assert }) => {
    const soon = { ...base, commitmentUntil: day('2026-12-20'), noticeDays: 30 }
    assert.equal(contractStatus(soon, today), 'upcoming')
    const late = { ...base, commitmentUntil: day('2026-11-20'), noticeDays: 30 }
    assert.equal(contractStatus(late, today), 'overdue')
    const ended = { ...soon, endedOn: day('2026-10-01') }
    assert.equal(contractStatus(ended, today), 'done')
    assert.isNull(currentTerm(ended, today))
  })
})
