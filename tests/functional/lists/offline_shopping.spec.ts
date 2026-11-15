import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import User from '#models/user'
import ShoppingItem from '#domains/lists/models/shopping_item'
import { Browser } from '#tests/helpers/browser'

/** What the offline queue sends: JSON, the redirect not followed. */
function replay(browser: Browser, method: 'PATCH' | 'POST', url: string, body: unknown) {
  return browser.request(url, {
    method,
    headers: { 'content-type': 'application/json', 'accept': 'text/html' },
    body: JSON.stringify(body),
  })
}

test.group('Lists | shopping replayed after being offline', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a check sent twice stays checked; a toggle without state still toggles', async ({
    assert,
  }) => {
    await User.create({ email: 'shop@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('shop@paper.local', 'secret123')
    await browser.request(urlFor('lists'))
    const item = await ShoppingItem.create({ label: 'Pain' })
    const url = urlFor('shopping.toggle', { id: item.id })

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await replay(browser, 'PATCH', url, { checked: true })
      assert.equal(response.status, 302)
    }
    await item.refresh()
    assert.isNotNull(item.checkedAt, 'still checked after the same action twice')

    await replay(browser, 'PATCH', url, { checked: false })
    await item.refresh()
    assert.isNull(item.checkedAt)

    await replay(browser, 'PATCH', url, {})
    await item.refresh()
    assert.isNotNull(item.checkedAt, 'no state: the page online toggles as before')

    await replay(browser, 'POST', urlFor('shopping.store'), { label: 'Lait' })
    assert.isNotNull(await ShoppingItem.findBy('label', 'Lait'))

    const gone = await replay(browser, 'PATCH', urlFor('shopping.toggle', { id: 999_999 }), {
      checked: true,
    })
    assert.equal(gone.status, 404, 'deleted meanwhile: the queue drops it')
  })
})
