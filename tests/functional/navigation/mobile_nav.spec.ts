import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import User from '#models/user'
import { Browser } from '#tests/helpers/browser'
import { renderPage } from '#tests/helpers/ssr'

/**
 * The bottom bar (`nav` with `md:hidden`) and the « Plus » sheet.
 */
function bottomBar(html: string): string {
  const bar = html.match(/<nav aria-label="Navigation principale" class="fixed[\s\S]*?<\/nav>/)
  if (!bar) throw new Error('No bottom bar in the page')
  return bar[0]
}

function sheet(html: string): string {
  const dialog = html.match(/<dialog aria-label="Plus"[\s\S]*?<\/dialog>/)
  if (!dialog) throw new Error('No « Plus » sheet in the page')
  return dialog[0]
}

test.group('Navigation | mobile', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the bottom bar keeps 3 dimensions and opens « Plus » for the rest', async ({ assert }) => {
    await User.create({ fullName: 'Clément', email: 'mobile@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('mobile@paper.local', 'secret123')

    const html = await renderPage(await browser.page(urlFor('today')))
    const bar = bottomBar(html)
    for (const label of ['Aujourd’hui', 'Agenda', 'Argent', 'Ajouter', 'Plus']) {
      assert.include(bar, `aria-label="${label}`)
    }
    assert.notInclude(bar, 'aria-label="Listes"')

    const more = sheet(html)
    for (const label of [
      'Listes',
      'Bilan du jour',
      'Véhicules',
      'Logement',
      'Toutes les fiches',
      'Compte rendu du mois',
      'Profil',
      'Se déconnecter',
    ]) {
      assert.include(more, label)
    }
  })

  test('« Plus » is active on the pages of its sheet', async ({ assert }) => {
    await User.create({ email: 'mobile2@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('mobile2@paper.local', 'secret123')

    const lists = bottomBar(await renderPage(await browser.page(urlFor('lists'))))
    assert.match(lists, /aria-label="Plus[^"]*"[^>]*class="[^"]*text-ink/)

    const money = bottomBar(await renderPage(await browser.page(urlFor('money'))))
    assert.match(money, /aria-label="Plus[^"]*"[^>]*class="[^"]*text-muted/)
    assert.match(
      money,
      /aria-current="page"[^>]*aria-label="Argent"|aria-label="Argent"[^>]*aria-current="page"/
    )
  })
})
