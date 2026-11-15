import { test } from '@japa/runner'
import {
  checkedOverrides,
  enqueue,
  pendingAdds,
  settled,
  withoutAdd,
  type OfflineAction,
} from '#shared/offline_queue'

test.group('Offline | shopping queue', () => {
  test('only the last state of an item is kept, adds stay in order', ({ assert }) => {
    let queue: OfflineAction[] = []
    queue = enqueue(queue, { kind: 'shopping.check', itemId: 1, checked: true })
    queue = enqueue(queue, { kind: 'shopping.add', key: 'a', label: 'Pain' })
    queue = enqueue(queue, { kind: 'shopping.check', itemId: 2, checked: true })
    queue = enqueue(queue, { kind: 'shopping.check', itemId: 1, checked: false })
    queue = enqueue(queue, { kind: 'shopping.add', key: 'b', label: 'Lait' })

    assert.deepEqual(
      [...checkedOverrides(queue)],
      [
        [2, true],
        [1, false],
      ]
    )
    assert.deepEqual(pendingAdds(queue), [
      { key: 'a', label: 'Pain' },
      { key: 'b', label: 'Lait' },
    ])
    assert.lengthOf(queue, 4)
    assert.deepEqual(pendingAdds(withoutAdd(queue, 'a')), [{ key: 'b', label: 'Lait' }])
  })

  test('what to drop from the queue once replayed', ({ assert }) => {
    assert.isTrue(settled(0, 'opaqueredirect'))
    assert.isTrue(settled(200, 'basic'))
    assert.isTrue(settled(404, 'basic'), 'deleted meanwhile: nothing left to do')
    assert.isFalse(settled(401, 'basic'))
    assert.isFalse(settled(419, 'basic'))
    assert.isFalse(settled(500, 'basic'))
  })
})
