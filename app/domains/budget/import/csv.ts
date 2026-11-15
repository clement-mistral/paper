import { normalize } from '#capture/normalizer'
import {
  MAX_LINES,
  StatementError,
  cleanLabel,
  lineRefs,
  parseAmount,
  parseDate,
  type StatementLine,
} from '#domains/budget/import/statement'

/**
 * Splits CSV text into rows (RFC 4180 quotes, any line ending).
 */
export function readRows(text: string, separator: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"' && field.trim() === '') {
      quoted = true
      field = ''
    } else if (char === separator) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
}

/** `;` for most French banks, else `,` or a tab: the most frequent in the first lines. */
export function detectSeparator(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 15).join('\n')
  const counts = [';', ',', '\t'].map((separator) => ({
    separator,
    count: sample.split(separator).length - 1,
  }))
  counts.sort((a, b) => b.count - a.count)
  return counts[0].count > 0 ? counts[0].separator : ';'
}

type Columns = {
  date: number
  label: number
  amount: number | null
  debit: number | null
  credit: number | null
}

const DATE = /^date( (d )?operation| op| comptable| de l operation)?$|^dateop$|^date operation$/
const VALUE_DATE = /valeur|dateval/
const LABEL = /libelle|label|description|intitule|detail|nature|motif|operation$/
const AMOUNT = /^(montant|amount|somme)( (en )?eur(os)?| de l operation)?$/
const DEBIT = /debit/
const CREDIT = /credit/

/**
 * Finds the header row among the first lines (some banks put the account
 * number and the balance above it) and the columns that matter.
 */
export function detectColumns(rows: string[][]): { header: number; columns: Columns } | null {
  for (let header = 0; header < Math.min(rows.length, 20); header++) {
    const names = rows[header].map((cell) => normalize(cell))
    const find = (pattern: RegExp, except?: RegExp) =>
      names.findIndex((name) => pattern.test(name) && !(except && except.test(name)))
    const date = find(DATE)
    const fallbackDate = date === -1 ? find(/date/, VALUE_DATE) : date
    const label = find(LABEL, /date/)
    const amount = find(AMOUNT)
    const debit = find(DEBIT)
    const credit = find(CREDIT)
    if (fallbackDate === -1 || label === -1) continue
    if (amount === -1 && (debit === -1 || credit === -1)) continue
    return {
      header,
      columns: {
        date: fallbackDate,
        label,
        amount: amount === -1 ? null : amount,
        debit: amount === -1 ? debit : null,
        credit: amount === -1 ? credit : null,
      },
    }
  }
  return null
}

/**
 * A CSV statement: separator and columns detected from the header row
 * (date, label, and an amount or a debit and a credit column). Rows
 * without a valid date and amount (totals, balances) are left out.
 */
export function parseCsv(text: string): StatementLine[] {
  const rows = readRows(text, detectSeparator(text))
  const detected = detectColumns(rows)
  if (!detected) {
    throw new StatementError(
      'Colonnes non reconnues : le fichier doit avoir une ligne d’en-tête avec une date, un libellé et un montant (ou un débit et un crédit).'
    )
  }
  const { header, columns } = detected
  const lines: Array<Omit<StatementLine, 'bankRef'>> = []
  for (const cells of rows.slice(header + 1)) {
    const occurredOn = parseDate(cells[columns.date] ?? '')
    const label = cleanLabel(cells[columns.label] ?? '')
    let amountCents: number | null
    if (columns.amount !== null) {
      amountCents = parseAmount(cells[columns.amount] ?? '')
    } else {
      const debit = parseAmount(cells[columns.debit!] ?? '')
      const credit = parseAmount(cells[columns.credit!] ?? '')
      amountCents =
        debit !== null && debit !== 0 ? -Math.abs(debit) : credit !== null ? Math.abs(credit) : null
    }
    if (!occurredOn || amountCents === null || amountCents === 0 || label === '') continue
    lines.push({ occurredOn, label, amountCents })
    if (lines.length > MAX_LINES)
      throw new StatementError('Relevé trop long (5 000 lignes au plus).')
  }
  return lineRefs(lines)
}
