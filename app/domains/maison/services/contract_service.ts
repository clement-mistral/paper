import emitter from '@adonisjs/core/services/emitter'
import Contract from '#domains/maison/models/contract'
import { contractStatus, currentTerm } from '#domains/maison/services/contract_terms'
import { toClaimRow } from '#domains/maison/services/claim_service'
import { monthlyCost } from '#domains/maison/services/billing_schedule'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import type { Domain } from '#shared/types/domain'
import type { ContractCategory, ContractDetail, ContractRow } from '#shared/types/maison'

export type ContractInput = {
  name: string
  category: ContractCategory
  domain: Domain
  provider?: string | null
  customerNumber?: string | null
  contractNumber?: string | null
  contact?: string | null
  startedOn?: string | null
  commitmentUntil?: string | null
  tacitRenewal?: boolean
  renewalMonths?: number | null
  noticeDays?: number | null
  endedOn?: string | null
  subscriptionId?: number | null
  notes?: string | null
}

const STATUS_ORDER = { overdue: 0, upcoming: 1, planned: 2, done: 3 } as const

/**
 * Public service of the Maison domain for contracts (energy, internet,
 * insurance…): commitment, tacit renewal and notice deadline.
 */
export default class ContractService {
  /**
   * Running contracts first, by urgency of their notice deadline.
   */
  async list(): Promise<ContractRow[]> {
    const contracts = await Contract.query().preload('subscription').orderBy('name')
    return contracts
      .map((contract) => this.toRow(contract))
      .sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          (a.noticeBy ?? '9999').localeCompare(b.noticeBy ?? '9999')
      )
  }

  /**
   * Running contracts with a notice deadline, for the reminder tasks.
   */
  async withNotice(): Promise<ContractRow[]> {
    const contracts = await this.list()
    return contracts.filter((contract) => !contract.ended && contract.noticeBy !== null)
  }

  async insurances(): Promise<Array<{ id: number; name: string }>> {
    const contracts = await Contract.query()
      .where('category', 'insurance')
      .whereNull('ended_on')
      .orderBy('name')
    return contracts.map(({ id, name }) => ({ id, name }))
  }

  async detail(id: number): Promise<ContractDetail> {
    const contract = await Contract.query()
      .where('id', id)
      .preload('subscription')
      .preload('claims', (query) => query.orderBy('occurred_on', 'desc'))
      .firstOrFail()
    const date = (value: Contract['startedOn']) => (value ? toIsoDate(value) : null)
    return {
      ...this.toRow(contract),
      customerNumber: contract.customerNumber,
      contractNumber: contract.contractNumber,
      contact: contract.contact,
      startedOn: date(contract.startedOn),
      commitmentUntil: date(contract.commitmentUntil),
      tacitRenewal: contract.tacitRenewal,
      renewalMonths: contract.renewalMonths,
      noticeDays: contract.noticeDays,
      endedOn: date(contract.endedOn),
      subscriptionId: contract.subscriptionId,
      notes: contract.notes,
      claims: contract.claims.map((claim) => toClaimRow(claim, contract)),
    }
  }

  async create(input: ContractInput): Promise<Contract> {
    const contract = new Contract()
    this.fill(contract, input)
    await contract.save()
    await this.changed(contract.id)
    return contract
  }

  async update(id: number, input: ContractInput): Promise<Contract> {
    const contract = await Contract.findOrFail(id)
    this.fill(contract, input)
    await contract.save()
    await this.changed(contract.id)
    return contract
  }

  /**
   * Removes the contract; its claims are kept, unlinked.
   */
  async delete(id: number) {
    const contract = await Contract.findOrFail(id)
    await contract.delete()
    await this.changed(id)
  }

  private changed(contractId: number) {
    return emitter.emit('maison:contract_changed', { contractId })
  }

  private fill(contract: Contract, input: ContractInput) {
    const date = (value: string | null | undefined) => (value ? fromIsoDate(value) : null)
    contract.merge({
      name: input.name,
      category: input.category,
      domain: input.domain,
      provider: input.provider || null,
      customerNumber: input.customerNumber || null,
      contractNumber: input.contractNumber || null,
      contact: input.contact || null,
      startedOn: date(input.startedOn),
      commitmentUntil: date(input.commitmentUntil),
      tacitRenewal: input.tacitRenewal ?? false,
      /** A tacit renewal without a duration renews for a year. */
      renewalMonths: input.renewalMonths ?? (input.tacitRenewal ? 12 : null),
      noticeDays: input.noticeDays ?? null,
      endedOn: date(input.endedOn),
      subscriptionId: input.subscriptionId ?? null,
      notes: input.notes || null,
    })
  }

  private toRow(contract: Contract): ContractRow {
    const day = today()
    const term = currentTerm(contract, day)
    const subscription = contract.subscription
    return {
      id: contract.id,
      name: contract.name,
      category: contract.category,
      domain: contract.domain,
      provider: contract.provider,
      termEndsOn: term ? toIsoDate(term.endsOn) : null,
      noticeBy: term ? toIsoDate(term.noticeBy) : null,
      status: contractStatus(contract, day),
      ended: contract.endedOn !== null,
      subscription: subscription
        ? {
            id: subscription.id,
            name: subscription.name,
            monthlyCostCents: monthlyCost(subscription.priceCents, subscription.frequency),
          }
        : null,
    }
  }
}
