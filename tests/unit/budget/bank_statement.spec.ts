import { test } from '@japa/runner'
import { detectSeparator, parseCsv, readRows } from '#domains/budget/import/csv'
import { isOfx, parseOfx } from '#domains/budget/import/ofx'
import { matchLines } from '#domains/budget/import/matching'
import {
  decode,
  displayLabel,
  merchantKey,
  parseAmount,
  parseDate,
} from '#domains/budget/import/statement'

const simple = (lines: Array<{ occurredOn: string; label: string; amountCents: number }>) =>
  lines.map(({ occurredOn, label, amountCents }) => [occurredOn, label, amountCents])

test.group('Budget | bank statement values', () => {
  test('reads French and English amounts', ({ assert }) => {
    assert.equal(parseAmount('-12,30'), -1230)
    assert.equal(parseAmount('1 234,56'), 123456)
    assert.equal(parseAmount('1 234,5 €'), 123450)
    assert.equal(parseAmount('+5'), 500)
    assert.equal(parseAmount('-1,234.56'), -123456)
    assert.equal(parseAmount('(42,00)'), -4200)
    assert.equal(parseAmount('12,30-'), -1230)
    assert.isNull(parseAmount(''))
    assert.isNull(parseAmount('Solde'))
  })

  test('reads dates, refuses impossible ones', ({ assert }) => {
    assert.equal(parseDate('12/11/2026'), '2026-11-12')
    assert.equal(parseDate('3/1/26'), '2026-01-03')
    assert.equal(parseDate('2026-11-12'), '2026-11-12')
    assert.equal(parseDate('12.11.2026'), '2026-11-12')
    assert.isNull(parseDate('31/02/2026'))
    assert.isNull(parseDate('Date'))
  })

  test('keeps the merchant of a bank label', ({ assert }) => {
    assert.equal(merchantKey('CB CARREFOUR MARKET 12/11 CARTE 4972'), 'carrefour market')
    assert.equal(merchantKey('PRLV SEPA EDF CLIENTS PARTICULIERS'), 'edf clients particuliers')
    assert.equal(merchantKey('VIR INST RECU DE MME LEA MARTIN'), 'mme lea martin')
    assert.equal(displayLabel('CB BOULANGERIE PAUL 03/11'), 'Boulangerie paul')
    assert.equal(displayLabel('CB CAFÉ DU COIN 12/11'), 'Café coin')
    assert.equal(displayLabel("PRLV SEPA L'ÉCOLE"), "L'école")
    assert.equal(displayLabel('X 1234'), 'X 1234')
  })

  test('decodes UTF-8, or Windows-1252 when it is not', ({ assert }) => {
    assert.equal(decode(new TextEncoder().encode('﻿Libellé')), 'Libellé')
    assert.equal(decode(new Uint8Array([0x4c, 0x69, 0x62, 0x65, 0x6c, 0x6c, 0xe9])), 'Libellé')
  })
})

test.group('Budget | CSV statements', () => {
  test('a statement with a preamble and a signed amount', ({ assert }) => {
    const text = [
      'Compte courant;FR76 3000 3000 0000 0000 0000 000',
      'Solde au 15/11/2026;1 520,30',
      '',
      "Date de l'opération;Libellé;Détail de l'écriture;Montant de l'opération;Devise",
      '12/11/2026;CB CARREFOUR 11/11;CARTE X4972;-54,20;EUR',
      '13/11/2026;"VIR SALAIRE ""NOVEMBRE""";;2 450,00;EUR',
      'Total;;;2 395,80;',
    ].join('\r\n')
    const lines = parseCsv(text)
    assert.deepEqual(simple(lines), [
      ['2026-11-12', 'CB CARREFOUR 11/11', -5420],
      ['2026-11-13', 'VIR SALAIRE "NOVEMBRE"', 245000],
    ])
    assert.match(lines[0].bankRef, /^csv:[0-9a-f]{40}$/)
  })

  test('debit and credit columns, and the same line twice in a day', ({ assert }) => {
    const text = [
      'Date;Date valeur;Libellé;Débit euros;Crédit euros',
      '03/11/2026;03/11/2026;PAIEMENT PAR CARTE CAFE DU COIN;3,20;',
      '03/11/2026;03/11/2026;PAIEMENT PAR CARTE CAFE DU COIN;3,20;',
      '05/11/2026;05/11/2026;REMBOURSEMENT MUTUELLE;;25,00',
    ].join('\n')
    const lines = parseCsv(text)
    assert.deepEqual(simple(lines), [
      ['2026-11-03', 'PAIEMENT PAR CARTE CAFE DU COIN', -320],
      ['2026-11-03', 'PAIEMENT PAR CARTE CAFE DU COIN', -320],
      ['2026-11-05', 'REMBOURSEMENT MUTUELLE', 2500],
    ])
    assert.notEqual(lines[0].bankRef, lines[1].bankRef, 'two coffees, two lines')
    assert.equal(parseCsv(text)[1].bankRef, lines[1].bankRef, 'stable from one import to the next')
  })

  test('English headers with commas', ({ assert }) => {
    const text = 'dateOp,label,amount\n2026-11-02,NETFLIX.COM,-13.49\n'
    assert.equal(detectSeparator(text), ',')
    assert.deepEqual(simple(parseCsv(text)), [['2026-11-02', 'NETFLIX.COM', -1349]])
  })

  test('refuses a file without recognisable columns', ({ assert }) => {
    assert.throws(() => parseCsv('a;b;c\n1;2;3\n'), /Colonnes non reconnues/)
    assert.deepEqual(readRows('a;"b;c"\n\n1;2', ';'), [
      ['a', 'b;c'],
      ['1', '2'],
    ])
  })
})

test.group('Budget | OFX statements', () => {
  test('an OFX 1.x statement without closing tags', ({ assert }) => {
    const text = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261112<TRNAMT>-54.20<FITID>2026111200001<NAME>CB CARREFOUR<MEMO>11/11 CARTE X4972
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261113120000[+1:CET]<TRNAMT>2450,00<FITID>2026111300002<NAME>VIR SALAIRE
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`
    assert.isTrue(isOfx(text))
    const lines = parseOfx(text)
    assert.deepEqual(simple(lines), [
      ['2026-11-12', 'CB CARREFOUR 11/11 CARTE X4972', -5420],
      ['2026-11-13', 'VIR SALAIRE', 245000],
    ])
    assert.deepEqual(
      lines.map((line) => line.bankRef),
      ['ofx:2026111200001', 'ofx:2026111300002']
    )
  })

  test('an OFX 2 (XML) statement', ({ assert }) => {
    const text = `<?xml version="1.0"?><OFX><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261101</DTPOSTED><TRNAMT>-13.49</TRNAMT><FITID>A1</FITID><NAME>NETFLIX</NAME></STMTTRN>
</BANKTRANLIST></OFX>`
    assert.deepEqual(simple(parseOfx(text)), [['2026-11-01', 'NETFLIX', -1349]])
    assert.isFalse(isOfx('Date;Libellé;Montant'))
  })
})

test.group('Budget | matching typed transactions', () => {
  const line = (occurredOn: string, label: string, amountCents: number) => ({
    occurredOn,
    label,
    amountCents,
    bankRef: `${occurredOn}${label}`,
  })

  test('same amount, bank date a few days later, each transaction once', ({ assert }) => {
    const lines = [
      line('2026-11-12', 'CB CARREFOUR 11/11', -5420),
      line('2026-11-12', 'CB LECLERC', -5420),
      line('2026-11-20', 'CB FNAC', -2999),
    ]
    const typed = [
      { id: 1, occurredOn: '2026-11-11', label: 'Courses Carrefour', amountCents: -5420 },
      { id: 2, occurredOn: '2026-11-10', label: 'Courses', amountCents: -5420 },
      { id: 3, occurredOn: '2026-11-01', label: 'Fnac', amountCents: -2999 },
    ]
    const matched = matchLines(lines, typed)
    assert.equal(matched.get(0), 1, 'the shared merchant word wins')
    assert.equal(matched.get(1), 2)
    assert.isFalse(matched.has(2), 'too long before')
  })

  test('the bank date may be slightly before the typed one', ({ assert }) => {
    const matched = matchLines(
      [line('2026-11-10', 'PRLV EDF', -8200)],
      [{ id: 7, occurredOn: '2026-11-12', label: 'Facture EDF', amountCents: -8200 }]
    )
    assert.equal(matched.get(0), 7)
    const tooEarly = matchLines(
      [line('2026-11-09', 'PRLV EDF', -8200)],
      [{ id: 7, occurredOn: '2026-11-12', label: 'Facture EDF', amountCents: -8200 }]
    )
    assert.equal(tooEarly.size, 0)
  })
})
