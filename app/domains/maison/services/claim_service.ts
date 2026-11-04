import { Exception } from '@adonisjs/core/exceptions'
import Claim from '#domains/maison/models/claim'
import type Contract from '#domains/maison/models/contract'
import Home from '#domains/maison/models/home'
import { fromIsoDate, toIsoDate } from '#support/dates'
import {
  OPEN_CLAIM_STATUSES,
  type ClaimDetail,
  type ClaimRow,
  type ClaimStatus,
} from '#shared/types/maison'

export type ClaimInput = {
  title: string
  occurredOn: string
  status: ClaimStatus
  contractId?: number | null
  declaredOn?: string | null
  claimNumber?: string | null
  damageCents?: number | null
  deductibleCents?: number | null
  compensationCents?: number | null
  compensatedOn?: string | null
  notes?: string | null
}

export function toClaimRow(claim: Claim, contract: Contract | null): ClaimRow {
  return {
    id: claim.id,
    title: claim.title,
    occurredOn: toIsoDate(claim.occurredOn),
    status: claim.status,
    insurer: contract ? (contract.provider ?? contract.name) : null,
    damageCents: claim.damageCents,
    compensationCents: claim.compensationCents,
  }
}

/**
 * Public service of the Maison domain for insurance claims (sinistres)
 * on the home.
 */
export default class ClaimService {
  /**
   * Claims still being handled first, then the most recent.
   */
  async forHome(homeId: number): Promise<ClaimRow[]> {
    const claims = await Claim.query()
      .where('home_id', homeId)
      .preload('contract')
      .orderBy('occurred_on', 'desc')
    const open = (claim: Claim) => (OPEN_CLAIM_STATUSES.includes(claim.status) ? 0 : 1)
    return claims
      .sort((a, b) => open(a) - open(b))
      .map((claim) => toClaimRow(claim, claim.contract ?? null))
  }

  async detail(id: number): Promise<ClaimDetail> {
    const claim = await Claim.query().where('id', id).preload('contract').firstOrFail()
    const date = (value: Claim['declaredOn']) => (value ? toIsoDate(value) : null)
    return {
      ...toClaimRow(claim, claim.contract ?? null),
      homeId: claim.homeId,
      contractId: claim.contractId,
      contract: claim.contract ? { id: claim.contract.id, name: claim.contract.name } : null,
      declaredOn: date(claim.declaredOn),
      claimNumber: claim.claimNumber,
      deductibleCents: claim.deductibleCents,
      compensatedOn: date(claim.compensatedOn),
      notes: claim.notes,
    }
  }

  async create(input: ClaimInput): Promise<Claim> {
    const home = await Home.query().orderBy('id').first()
    if (!home) throw new Exception('Créez d’abord le logement', { status: 409 })
    const claim = new Claim()
    claim.homeId = home.id
    this.fill(claim, input)
    await claim.save()
    return claim
  }

  async update(id: number, input: ClaimInput): Promise<Claim> {
    const claim = await Claim.findOrFail(id)
    this.fill(claim, input)
    await claim.save()
    return claim
  }

  async delete(id: number): Promise<Claim> {
    const claim = await Claim.findOrFail(id)
    await claim.delete()
    return claim
  }

  private fill(claim: Claim, input: ClaimInput) {
    const date = (value: string | null | undefined) => (value ? fromIsoDate(value) : null)
    claim.merge({
      title: input.title,
      occurredOn: fromIsoDate(input.occurredOn),
      status: input.status,
      contractId: input.contractId ?? null,
      declaredOn: date(input.declaredOn),
      claimNumber: input.claimNumber || null,
      damageCents: input.damageCents ?? null,
      deductibleCents: input.deductibleCents ?? null,
      compensationCents: input.compensationCents ?? null,
      compensatedOn: date(input.compensatedOn),
      notes: input.notes || null,
    })
  }
}
