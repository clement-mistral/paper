import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import AliasService from '#capture/services/alias_service'
import Account from '#domains/budget/models/account'
import BankImport from '#domains/budget/models/bank_import'
import BankImportLine from '#domains/budget/models/bank_import_line'
import Transaction from '#domains/budget/models/transaction'
import EnvelopeService from '#domains/budget/services/envelope_service'
import { isOfx, parseOfx } from '#domains/budget/import/ofx'
import { parseCsv } from '#domains/budget/import/csv'
import { DAYS_AFTER, DAYS_BEFORE, matchLines } from '#domains/budget/import/matching'
import {
  StatementError,
  decode,
  displayLabel,
  merchantKey,
  type ParsedStatement,
} from '#domains/budget/import/statement'
import { currentUserId } from '#support/actor'
import { fromIsoDate, toIsoDate } from '#support/dates'
import type {
  BankImportDetail,
  BankImportSummary,
  BankLineChoice,
  BankLineStatus,
} from '#shared/types/budget'

/**
 * Reads a statement file: OFX when it says so, else CSV.
 */
export function parseStatement(fileName: string, bytes: Uint8Array): ParsedStatement {
  const text = decode(bytes)
  const lines = /\.(ofx|qfx)$/i.test(fileName) || isOfx(text) ? parseOfx(text) : parseCsv(text)
  if (lines.length === 0) throw new StatementError('Aucune opération lisible dans ce fichier.')
  return { format: isOfx(text) ? 'ofx' : 'csv', lines }
}

const EMPTY_COUNTS: Record<BankLineStatus, number> = {
  new: 0,
  matched: 0,
  duplicate: 0,
  skipped: 0,
  imported: 0,
}

/**
 * Public service of the Budget domain for bank statements. A statement is
 * staged and reviewed before anything is recorded:
 * 1. `stage`: every line is new, a duplicate (already imported on the
 *    account) or matched to a transaction typed by hand; an envelope is
 *    proposed for each new expense (aliases, then names);
 * 2. `confirm`: new lines become transactions, matched ones are marked
 *    as confirmed by the bank; an envelope chosen by hand is learned;
 * 3. `cancel`: a pending import is dropped, a confirmed one undone.
 */
@inject()
export default class BankImportService {
  constructor(
    private envelopes: EnvelopeService,
    private aliases: AliasService
  ) {}

  async stage(accountId: number, file: { name: string; bytes: Uint8Array }): Promise<BankImport> {
    const account = await Account.findOrFail(accountId)
    const statement = parseStatement(file.name, file.bytes)
    const { lines } = statement

    const days = lines.map((line) => line.occurredOn).sort()
    const [known, candidates] = await Promise.all([
      Transaction.query()
        .where('account_id', account.id)
        .whereIn(
          'bank_ref',
          lines.map((line) => line.bankRef)
        )
        .select('bank_ref'),
      Transaction.query()
        .where((query) => query.where('account_id', account.id).orWhereNull('account_id'))
        .whereNull('bank_ref')
        .whereBetween('occurred_on', [
          toIsoDate(fromIsoDate(days[0]).minus({ days: DAYS_AFTER })),
          toIsoDate(fromIsoDate(days.at(-1)!).plus({ days: DAYS_BEFORE })),
        ]),
    ])
    const imported = new Set(known.map((row) => row.bankRef))
    const fresh = lines.filter((line) => !imported.has(line.bankRef))
    const matched = matchLines(
      fresh,
      candidates.map((row) => ({
        id: row.id,
        occurredOn: toIsoDate(row.occurredOn),
        label: row.label,
        amountCents: row.amountCents,
      }))
    )
    const matchOf = new Map(fresh.map((line, index) => [line.bankRef, matched.get(index)]))

    const proposals = new Map<string, number | null>()
    for (const line of fresh) {
      const key = merchantKey(line.label)
      if (line.amountCents > 0 || key === '' || proposals.has(key)) continue
      const envelope = await this.envelopes.match(key)
      proposals.set(key, envelope?.id ?? null)
    }

    return db.transaction(async (trx) => {
      const bankImport = await BankImport.create(
        {
          accountId: account.id,
          fileName: file.name.slice(0, 255),
          format: statement.format,
          status: 'pending',
          createdById: currentUserId(),
        },
        { client: trx }
      )
      await BankImportLine.createMany(
        lines.map((line, position) => {
          const matchedId = matchOf.get(line.bankRef) ?? null
          const status: BankLineStatus = imported.has(line.bankRef)
            ? 'duplicate'
            : matchedId
              ? 'matched'
              : 'new'
          return {
            bankImportId: bankImport.id,
            position,
            occurredOn: fromIsoDate(line.occurredOn),
            label: line.label,
            amountCents: line.amountCents,
            bankRef: line.bankRef,
            status,
            matchedTransactionId: status === 'matched' ? matchedId : null,
            envelopeId: status === 'new' ? (proposals.get(merchantKey(line.label)) ?? null) : null,
          }
        }),
        { client: trx }
      )
      return bankImport
    })
  }

  async history(accountId: number): Promise<BankImportSummary[]> {
    const imports = await BankImport.query()
      .where('account_id', accountId)
      .preload('lines')
      .orderBy('created_at', 'desc')
      .limit(20)
    return imports.map((item) => this.summary(item))
  }

  async detail(accountId: number, id: number): Promise<BankImportDetail> {
    const bankImport = await BankImport.query()
      .where({ id, accountId })
      .preload('lines', (query) => query.orderBy('position').preload('matchedTransaction'))
      .firstOrFail()
    const account = await Account.findOrFail(accountId)
    return {
      ...this.summary(bankImport),
      account: { id: account.id, name: account.name },
      lines: bankImport.lines.map((line) => ({
        id: line.id,
        occurredOn: toIsoDate(line.occurredOn),
        label: line.label,
        displayLabel: displayLabel(line.label),
        amountCents: line.amountCents,
        status: line.status,
        envelopeId: line.envelopeId,
        matched: line.matchedTransaction
          ? {
              id: line.matchedTransaction.id,
              label: line.matchedTransaction.label,
              occurredOn: toIsoDate(line.matchedTransaction.occurredOn),
            }
          : null,
      })),
    }
  }

  /**
   * Records the reviewed statement in one transaction. `choices` say, for
   * the new lines, whether to keep them and on which envelope.
   */
  async confirm(accountId: number, id: number, choices: BankLineChoice[]) {
    const byLine = new Map(choices.map((choice) => [choice.id, choice]))
    return db.transaction(async (trx) => {
      const bankImport = await BankImport.query({ client: trx })
        .where({ id, accountId })
        .forUpdate()
        .firstOrFail()
      if (bankImport.status !== 'pending') {
        throw new Exception('Ce relevé est déjà importé', { status: 422 })
      }
      const lines = await BankImportLine.query({ client: trx })
        .where('bank_import_id', id)
        .orderBy('position')

      let created = 0
      let confirmed = 0
      for (const line of lines) {
        if (line.status === 'matched' && line.matchedTransactionId) {
          const transaction = await Transaction.find(line.matchedTransactionId, { client: trx })
          if (transaction && transaction.bankRef === null) {
            transaction.bankRef = line.bankRef
            transaction.accountId ??= accountId
            await transaction.useTransaction(trx).save()
            confirmed++
            continue
          }
          line.status = 'new'
        }
        if (line.status !== 'new') continue

        const choice = byLine.get(line.id)
        if (choice && !choice.include) {
          line.status = 'skipped'
          await line.useTransaction(trx).save()
          continue
        }
        const envelopeId =
          line.amountCents < 0 ? (choice ? choice.envelopeId : line.envelopeId) : null
        if (envelopeId !== line.envelopeId && envelopeId !== null) {
          const key = merchantKey(line.label)
          if (key !== '') await this.aliases.learn('envelope', envelopeId, key, trx)
        }
        const transaction = await Transaction.create(
          {
            accountId,
            envelopeId,
            amountCents: line.amountCents,
            label: displayLabel(line.label),
            occurredOn: line.occurredOn,
            domain: 'budget',
            bankRef: line.bankRef,
            captureText: line.label,
          },
          { client: trx }
        )
        line.merge({ status: 'imported', transactionId: transaction.id, envelopeId })
        await line.useTransaction(trx).save()
        created++
      }

      bankImport.merge({ status: 'done', confirmedAt: DateTime.now() })
      await bankImport.useTransaction(trx).save()
      return { created, confirmed }
    })
  }

  /**
   * Drops a pending import, or undoes a confirmed one: its transactions
   * are deleted and the ones it confirmed lose the bank's mark.
   */
  async cancel(accountId: number, id: number): Promise<'dropped' | 'undone'> {
    return db.transaction(async (trx) => {
      const bankImport = await BankImport.query({ client: trx })
        .where({ id, accountId })
        .forUpdate()
        .firstOrFail()
      const lines = await BankImportLine.query({ client: trx }).where('bank_import_id', id)
      const status = bankImport.status
      if (status === 'done') {
        const created = lines.flatMap((line) => (line.transactionId ? [line.transactionId] : []))
        if (created.length > 0) {
          await Transaction.query({ client: trx }).whereIn('id', created).delete()
        }
        const matchedRefs = lines
          .filter((line) => line.status === 'matched')
          .map((line) => line.bankRef)
        if (matchedRefs.length > 0) {
          await Transaction.query({ client: trx })
            .where('account_id', accountId)
            .whereIn('bank_ref', matchedRefs)
            .update({ bank_ref: null })
        }
      }
      await bankImport.useTransaction(trx).delete()
      return status === 'done' ? 'undone' : 'dropped'
    })
  }

  private summary(bankImport: BankImport): BankImportSummary {
    const counts = { ...EMPTY_COUNTS }
    for (const line of bankImport.lines) counts[line.status]++
    const days = bankImport.lines.map((line) => toIsoDate(line.occurredOn)).sort()
    return {
      id: bankImport.id,
      fileName: bankImport.fileName,
      format: bankImport.format,
      status: bankImport.status,
      createdAt: bankImport.createdAt.toISO()!,
      from: days[0] ?? null,
      to: days.at(-1) ?? null,
      counts,
    }
  }
}
