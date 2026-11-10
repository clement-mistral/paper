import { singularKey } from '#capture/normalizer'

/**
 * Fruits and vegetables of France métropolitaine by month, after the
 * usual seasonal calendars (open-field harvest, or stored for the
 * keeping kinds: apples, celeriac…). A fixed list: correct an entry here.
 *
 * Produce found all year (carrot, onion, potato…) is listed with no
 * months: never printed, but it keeps « pomme de terre » from reading as
 * « pomme », or « noix de coco » as « noix ».
 */
type Produce = { name: string; kind: 'vegetable' | 'fruit'; months: number[] }

const span = (from: number, to: number): number[] => {
  const months: number[] = []
  for (let month = from; ; month = (month % 12) + 1) {
    months.push(month)
    if (month === to) return months
  }
}

const vegetable = (name: string, months: number[]): Produce => ({
  name,
  kind: 'vegetable',
  months,
})
const fruit = (name: string, months: number[]): Produce => ({ name, kind: 'fruit', months })

export const PRODUCE: Produce[] = [
  vegetable('ail', span(6, 9)),
  vegetable('artichaut', span(5, 9)),
  vegetable('asperge', span(4, 6)),
  vegetable('aubergine', span(6, 9)),
  vegetable('betterave', span(7, 3)),
  vegetable('blette', span(6, 11)),
  vegetable('brocoli', span(6, 11)),
  vegetable('butternut', span(9, 2)),
  vegetable('céleri', span(9, 3)),
  vegetable('céleri branche', span(6, 10)),
  vegetable('chou', span(10, 3)),
  vegetable('chou de Bruxelles', span(10, 2)),
  vegetable('chou-fleur', span(9, 4)),
  vegetable('chou rouge', span(9, 2)),
  vegetable('concombre', span(5, 9)),
  vegetable('courge', span(9, 2)),
  vegetable('courgette', span(6, 9)),
  vegetable('endive', span(10, 4)),
  vegetable('épinard', [3, 4, 5, 9, 10, 11]),
  vegetable('fenouil', span(6, 10)),
  vegetable('fève', span(5, 7)),
  vegetable('haricot vert', span(6, 9)),
  vegetable('laitue', span(4, 10)),
  vegetable('mâche', span(10, 3)),
  vegetable('maïs', span(8, 9)),
  vegetable('navet', span(10, 3)),
  vegetable('panais', span(10, 3)),
  vegetable('petit pois', span(5, 7)),
  vegetable('poireau', span(9, 4)),
  vegetable('poivron', span(7, 10)),
  vegetable('potimarron', span(9, 1)),
  vegetable('potiron', span(9, 1)),
  vegetable('radis', span(4, 7)),
  vegetable('radis noir', span(10, 2)),
  vegetable('rhubarbe', span(4, 6)),
  vegetable('salsifis', span(10, 2)),
  vegetable('tomate', span(6, 9)),
  vegetable('tomate cerise', span(6, 9)),
  vegetable('topinambour', span(10, 3)),

  fruit('abricot', span(6, 8)),
  fruit('cassis', [7]),
  fruit('cerise', span(5, 7)),
  fruit('châtaigne', span(10, 12)),
  fruit('clémentine', span(11, 2)),
  fruit('coing', span(10, 11)),
  fruit('figue', span(8, 10)),
  fruit('fraise', span(4, 7)),
  fruit('framboise', span(6, 9)),
  fruit('groseille', span(7, 8)),
  fruit('kiwi', span(11, 4)),
  fruit('melon', span(6, 9)),
  fruit('mirabelle', span(8, 9)),
  fruit('mûre', span(8, 9)),
  fruit('myrtille', span(7, 9)),
  fruit('nectarine', span(6, 9)),
  fruit('noisette', span(9, 10)),
  fruit('noix', span(9, 12)),
  fruit('orange', span(12, 3)),
  fruit('pastèque', span(7, 8)),
  fruit('pêche', span(6, 9)),
  fruit('poire', span(8, 1)),
  fruit('pomme', span(9, 4)),
  fruit('prune', span(7, 9)),
  fruit('raisin', span(8, 10)),

  // All year: never printed, only to match the right produce.
  vegetable('carotte', []),
  vegetable('champignon', []),
  vegetable('échalote', []),
  vegetable('oignon', []),
  vegetable('pomme de terre', []),
  vegetable('patate douce', []),
  fruit('banane', []),
  fruit('citron', []),
  fruit('noix de coco', []),
  fruit('noix de muscade', []),
]

const KEYED = PRODUCE.map((produce) => ({ ...produce, key: singularKey(produce.name) }))

/** Fruits and vegetables of a month (1–12), in alphabetical order. */
export function inSeason(month: number): { vegetables: string[]; fruits: string[] } {
  const of = (kind: Produce['kind']) =>
    PRODUCE.filter((produce) => produce.kind === kind && produce.months.includes(month))
      .map((produce) => produce.name)
      .sort((left, right) => left.localeCompare(right, 'fr'))
  return { vegetables: of('vegetable'), fruits: of('fruit') }
}

/**
 * The produce an ingredient is made of (« Blancs de poireaux » →
 * poireau): the longest name found in it as whole words. Null when none.
 */
export function produceOf(ingredientKey: string): Produce | null {
  const padded = ` ${ingredientKey} `
  let best: (typeof KEYED)[number] | null = null
  for (const produce of KEYED) {
    if (!padded.includes(` ${produce.key} `)) continue
    if (!best || produce.key.length > best.key.length) best = produce
  }
  return best
}
