import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Account from '#domains/budget/models/account'
import type { AccountDetail, AccountSummary, AccountType } from '#shared/types/budget'

export type AccountInput = {
  name: string
  type: AccountType
  institution?: string
  openingBalance?: number
  isDefault?: boolean
  notes?: string
}

/**
 * Public service of the Budget domain for accounts.
 */
export default class AccountService {
  async list(): Promise<AccountSummary[]> {
    const accounts = await Account.query()
      .select('accounts.*')
      .select(
        db.raw(
          '(accounts.opening_balance_cents + coalesce((select sum(t.amount_cents) from transactions t where t.account_id = accounts.id), 0))::int as balance_cents'
        )
      )
      .orderBy('is_default', 'desc')
      .orderBy('name')

    return accounts.map((account) => this.toSummary(account))
  }

  async detail(id: number): Promise<AccountDetail> {
    const account = await Account.findOrFail(id)
    const totals = await db
      .from('transactions')
      .where('account_id', id)
      .select(db.raw('coalesce(sum(amount_cents), 0)::int as total, count(*)::int as count'))
      .firstOrFail()

    return {
      ...this.toSummary(account),
      balanceCents: account.openingBalanceCents + Number(totals.total),
      openingBalanceCents: account.openingBalanceCents,
      notes: account.notes,
      transactionCount: Number(totals.count),
    }
  }

  /**
   * The account an expense lands on when none is given: the one flagged
   * as default, or the only account.
   */
  async defaultAccount(client?: TransactionClientContract): Promise<Account | null> {
    const flagged = await Account.query({ client }).where('is_default', true).first()
    if (flagged) return flagged
    const accounts = await Account.query({ client }).limit(2)
    return accounts.length === 1 ? accounts[0] : null
  }

  async balance(id: number): Promise<number> {
    const account = await Account.findOrFail(id)
    const row = await db
      .from('transactions')
      .where('account_id', id)
      .select(db.raw('coalesce(sum(amount_cents), 0)::int as total'))
      .firstOrFail()
    return account.openingBalanceCents + Number(row.total)
  }

  async create(input: AccountInput): Promise<Account> {
    return db.transaction(async (trx) => {
      const account = new Account().useTransaction(trx)
      this.fill(account, input)
      await account.save()
      if (account.isDefault) await this.unsetOtherDefaults(account.id, trx)
      return account
    })
  }

  async update(id: number, input: AccountInput): Promise<Account> {
    return db.transaction(async (trx) => {
      const account = await Account.findOrFail(id, { client: trx })
      this.fill(account, input)
      await account.save()
      if (account.isDefault) await this.unsetOtherDefaults(account.id, trx)
      return account
    })
  }

  async delete(id: number) {
    await db.transaction(async (trx) => {
      const account = await Account.findOrFail(id, { client: trx })
      await account.delete()
    })
  }

  private fill(account: Account, input: AccountInput) {
    account.name = input.name
    account.type = input.type
    account.institution = input.institution ?? null
    account.openingBalanceCents = input.openingBalance ?? 0
    account.isDefault = input.isDefault ?? false
    account.notes = input.notes ?? null
  }

  private async unsetOtherDefaults(id: number, trx: TransactionClientContract) {
    await Account.query({ client: trx }).whereNot('id', id).update({ isDefault: false })
  }

  private toSummary(account: Account): AccountSummary {
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      institution: account.institution,
      isDefault: account.isDefault,
      balanceCents: Number(account.$extras.balance_cents ?? account.openingBalanceCents),
    }
  }
}
