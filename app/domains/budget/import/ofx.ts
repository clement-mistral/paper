import {
  MAX_LINES,
  StatementError,
  cleanLabel,
  lineRefs,
  parseAmount,
  type StatementLine,
} from '#domains/budget/import/statement'

/** Whether a text looks like an OFX (or QFX) file, SGML or XML. */
export function isOfx(text: string): boolean {
  return /<OFX>/i.test(text) || /^\s*OFXHEADER:/i.test(text)
}

function field(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))
  return match ? match[1].trim() : null
}

/** `20261112`, `20261112120000[+1:CET]` → `2026-11-12`. */
function ofxDate(raw: string | null): string | null {
  const match = raw?.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

/**
 * The transactions of an OFX statement (`<STMTTRN>` blocks; closing tags
 * are optional in OFX 1.x). The bank's FITID is the line's reference.
 */
export function parseOfx(text: string): StatementLine[] {
  const blocks = text.split(/<STMTTRN>/i).slice(1)
  if (blocks.length === 0) throw new StatementError('Aucune opération dans ce fichier OFX.')
  if (blocks.length > MAX_LINES)
    throw new StatementError('Relevé trop long (5 000 lignes au plus).')

  const withId: StatementLine[] = []
  const withoutId: Array<Omit<StatementLine, 'bankRef'>> = []
  for (const raw of blocks) {
    const block = raw.split(/<\/STMTTRN>|<\/BANKTRANLIST>/i)[0]
    const occurredOn = ofxDate(field(block, 'DTPOSTED'))
    const amountCents = parseAmount(field(block, 'TRNAMT') ?? '')
    const name = field(block, 'NAME') ?? ''
    const memo = field(block, 'MEMO') ?? ''
    const label = cleanLabel(memo && !name.includes(memo) ? `${name} ${memo}` : name || memo)
    if (!occurredOn || amountCents === null || amountCents === 0 || label === '') continue
    const fitId = field(block, 'FITID')
    if (fitId)
      withId.push({ occurredOn, label, amountCents, bankRef: `ofx:${fitId}`.slice(0, 120) })
    else withoutId.push({ occurredOn, label, amountCents })
  }
  return [...withId, ...lineRefs(withoutId)]
}
