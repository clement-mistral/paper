/**
 * What the shopping list does while the device is offline: actions are
 * kept on the device, in order, and sent once the network is back. Pure
 * functions, so the client and the tests share them.
 */
export type OfflineAction =
  | { kind: 'shopping.check'; itemId: number; checked: boolean }
  | { kind: 'shopping.add'; key: string; label: string }

/**
 * Adds an action. Checking an item replaces an earlier state of the same
 * item (only the last one matters, and it is sent as a state, not a
 * toggle, so sending it twice is harmless).
 */
export function enqueue(queue: OfflineAction[], action: OfflineAction): OfflineAction[] {
  if (action.kind === 'shopping.check') {
    return [
      ...queue.filter(
        (queued) => !(queued.kind === 'shopping.check' && queued.itemId === action.itemId)
      ),
      action,
    ]
  }
  return [...queue, action]
}

/** An item typed offline and taken back before being sent. */
export function withoutAdd(queue: OfflineAction[], key: string): OfflineAction[] {
  return queue.filter((queued) => !(queued.kind === 'shopping.add' && queued.key === key))
}

/** The state to show for items checked or unchecked offline. */
export function checkedOverrides(queue: OfflineAction[]): Map<number, boolean> {
  const overrides = new Map<number, boolean>()
  for (const action of queue) {
    if (action.kind === 'shopping.check') overrides.set(action.itemId, action.checked)
  }
  return overrides
}

/** Items typed offline, not sent yet. */
export function pendingAdds(queue: OfflineAction[]): Array<{ key: string; label: string }> {
  return queue.flatMap((action) =>
    action.kind === 'shopping.add' ? [{ key: action.key, label: action.label }] : []
  )
}

/**
 * Whether the answer to a replayed action means it is done with: sent
 * (a redirect back), or pointless now (the item was deleted meanwhile).
 * Anything else (network error, signed out) keeps it for later.
 */
export function settled(status: number, type: string): boolean {
  return type === 'opaqueredirect' || (status >= 200 && status < 400) || status === 404
}
