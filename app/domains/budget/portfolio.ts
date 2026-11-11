import type { OperationKind } from '#shared/types/budget'
import type { Bar } from '#domains/budget/market/yahoo'

/**
 * Arithmetic of a portfolio line, from its operations alone. The cost of
 * what is held follows the weighted average (« prix moyen pondéré »), the
 * method of the French tax office: a sale releases its share of the cost
 * at the average price and leaves the average of the rest unchanged.
 */

export type Operation = {
  kind: OperationKind
  occurredOn: string
  quantity: number | null
  unitPrice: number | null
  feesCents: number
  amountCents: number
}

export type Position = {
  quantity: number
  /** Cost of the units still held, fees included, cents. */
  costCents: number
  /** Gains and losses of the sales, against the average cost. */
  realizedCents: number
  dividendsCents: number
  feesCents: number
}

/** Below this, a quantity is a rounding leftover: nothing is held. */
const EPSILON = 1e-9

/**
 * What a trade takes from or brings to the account's cash: the units at
 * their price, fees added to a purchase and taken from a sale.
 */
export function tradeAmountCents(
  kind: 'buy' | 'sell',
  quantity: number,
  unitPrice: number,
  feesCents: number
): number {
  const gross = Math.round(quantity * unitPrice * 100)
  return kind === 'buy' ? gross + feesCents : gross - feesCents
}

function byDate(left: Operation, right: Operation): number {
  return left.occurredOn.localeCompare(right.occurredOn)
}

/** The line once the operations up to `until` (included) are played. */
export function positionOf(operations: Operation[], until?: string): Position {
  const position: Position = {
    quantity: 0,
    costCents: 0,
    realizedCents: 0,
    dividendsCents: 0,
    feesCents: 0,
  }
  for (const operation of [...operations].sort(byDate)) {
    if (until && operation.occurredOn > until) break
    const quantity = operation.quantity ?? 0
    switch (operation.kind) {
      case 'buy':
        position.quantity += quantity
        position.costCents += operation.amountCents
        break
      case 'sell': {
        const sold = Math.min(quantity, position.quantity)
        const released =
          position.quantity > EPSILON ? (position.costCents * sold) / position.quantity : 0
        position.realizedCents += operation.amountCents - released
        position.costCents -= released
        position.quantity -= sold
        break
      }
      case 'dividend':
        position.dividendsCents += operation.amountCents
        break
      case 'fee':
        position.feesCents += operation.amountCents
        break
    }
    if (position.quantity < EPSILON) {
      position.quantity = 0
      position.costCents = 0
    }
  }
  return {
    quantity: position.quantity,
    costCents: Math.round(position.costCents),
    realizedCents: Math.round(position.realizedCents),
    dividendsCents: position.dividendsCents,
    feesCents: position.feesCents,
  }
}

/**
 * The first operation that sells more than was held at its date, in
 * date order; null when the line never goes below zero.
 */
export function oversold(operations: Operation[]): Operation | null {
  let held = 0
  for (const operation of [...operations].sort(byDate)) {
    if (operation.kind === 'buy') held += operation.quantity ?? 0
    if (operation.kind === 'sell') {
      held -= operation.quantity ?? 0
      if (held < -EPSILON) return operation
    }
  }
  return null
}

/** The last close on or before `day`, and the one before it. */
export function closeOn(
  bars: Bar[],
  day: string
): { close: number; day: string; previous: number | null } | null {
  for (let index = bars.length - 1; index >= 0; index--) {
    if (bars[index].day <= day) {
      return {
        close: bars[index].close,
        day: bars[index].day,
        previous: index > 0 ? bars[index - 1].close : null,
      }
    }
  }
  return null
}

/**
 * Return over a period with money put in or taken out along the way
 * (simple Dietz): the gain, flows taken out, over the starting value plus
 * each flow weighted by the share of the period it was invested. Flows
 * are positive when money went in. Null when nothing was at stake.
 */
export function simpleDietz(input: {
  startCents: number
  endCents: number
  /** Dividends and other income received during the period. */
  incomeCents: number
  flows: Array<{ cents: number; weight: number }>
}): number | null {
  const net = input.flows.reduce((total, flow) => total + flow.cents, 0)
  const weighted = input.flows.reduce((total, flow) => total + flow.cents * flow.weight, 0)
  const base = input.startCents + weighted
  if (base <= 0) return null
  return ((input.endCents - input.startCents - net + input.incomeCents) / base) * 100
}
