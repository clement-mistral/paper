import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { DateTime } from 'luxon'
import User from '#models/user'
import HouseholdInvitation from '#models/household_invitation'
import Task from '#domains/lists/models/task'
import Transaction from '#domains/budget/models/transaction'
import { Browser } from '#tests/helpers/browser'
import type { HouseholdPanel } from '#shared/types/household'

async function signedIn(email: string, fullName: string) {
  const user = await User.create({ email, fullName, password: 'secret123' })
  const browser = new Browser()
  await browser.login(email, 'secret123')
  return { user, browser }
}

/**
 * Invites from the profile and reads the one-time link in the flash.
 */
async function inviteLink(browser: Browser): Promise<string> {
  await browser.request(urlFor('profile.show'))
  const response = await browser.submit(urlFor('household.invite'), {})
  if (response.status !== 302) throw new Error(`invite answered ${response.status}`)
  const page = (await browser.page(urlFor('profile.show'))) as unknown as {
    flash: { invitation?: string }
  }
  return page.flash.invitation!
}

/** The props of a page, for one-line assertions. */
async function propsOf(browser: Browser, path: string) {
  const page = await browser.page(path)
  return page.props
}

function joinForm(email: string, fullName = 'Léa Martin') {
  return { fullName, email, password: 'secret123', passwordConfirmation: 'secret123' }
}

test.group('Household | members', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('self-signup only creates the household', async ({ assert }) => {
    const first = new Browser()
    let login = await first.page(urlFor('session.create'))
    assert.isTrue(login.props.signupOpen)

    await User.create({ email: 'owner@paper.local', password: 'secret123' })
    login = await first.page(urlFor('session.create'))
    assert.isFalse(login.props.signupOpen)

    const page = await first.request(urlFor('new_account.create'))
    assert.equal(page.status, 302)
    await first.request(urlFor('session.create'))
    const response = await first.submit(urlFor('new_account.store'), joinForm('intrus@paper.local'))
    assert.equal(response.status, 302)
    assert.isNull(await User.findBy('email', 'intrus@paper.local'))
  })

  test('an invitation link creates one account, once', async ({ assert }) => {
    const { browser } = await signedIn('camille@paper.local', 'Camille Durand')
    const link = await inviteLink(browser)
    const path = new URL(link).pathname
    assert.match(path, /^\/invitation\/[\w-]{20,}$/)

    const stored = await HouseholdInvitation.firstOrFail()
    assert.notInclude(stored.tokenHash, path.split('/').pop()!, 'only a hash is kept')

    const guest = new Browser()
    const invitation = await guest.page(path)
    assert.equal(invitation.component, 'auth/invitation')
    assert.equal(invitation.props.invitedBy, 'Camille Durand')

    const joined = await guest.submit(path, joinForm('lea@paper.local'))
    assert.equal(joined.status, 302)
    const lea = await User.findByOrFail('email', 'lea@paper.local')
    const today = await guest.page(urlFor('today'))
    assert.equal((today.props.user as { id: number }).id, lea.id)
    assert.lengthOf(today.props.members as unknown[], 2)

    const again = new Browser()
    const expiredPage = await propsOf(again, path)
    assert.isNull(expiredPage.invitedBy)
    await again.submit(path, joinForm('tom@paper.local', 'Tom'))
    assert.isNull(await User.findBy('email', 'tom@paper.local'))
  })

  test('an expired or withdrawn invitation no longer works', async ({ assert }) => {
    const { browser } = await signedIn('camille2@paper.local', 'Camille')
    const expiredLink = new URL(await inviteLink(browser)).pathname
    const withdrawnLink = new URL(await inviteLink(browser)).pathname
    const [expired, withdrawn] = await HouseholdInvitation.query().orderBy('id')
    expired.expiresAt = DateTime.now().minus({ minutes: 1 })
    await expired.save()

    let profile = await propsOf(browser, urlFor('profile.show'))
    let panel = profile.household as HouseholdPanel
    assert.lengthOf(panel.invitations, 1, 'the expired one is not listed')
    await browser.request(urlFor('household.revoke', { id: withdrawn.id }), { method: 'DELETE' })
    profile = await propsOf(browser, urlFor('profile.show'))
    panel = profile.household as HouseholdPanel
    assert.lengthOf(panel.invitations, 0)

    for (const path of [expiredLink, withdrawnLink]) {
      const guest = new Browser()
      const page = await propsOf(guest, path)
      assert.isNull(page.invitedBy)
    }
  })

  test('a member can remove another, never themselves', async ({ assert }) => {
    const { user: camille, browser } = await signedIn('camille3@paper.local', 'Camille')
    const lea = await User.create({ email: 'lea3@paper.local', fullName: 'Léa', password: 'x' })
    await Task.create({ title: 'Arroser', createdById: lea.id })

    const self = await browser.request(urlFor('household.remove', { id: camille.id }), {
      method: 'DELETE',
    })
    assert.notEqual(self.status, 200)
    assert.isNotNull(await User.find(camille.id))

    await browser.request(urlFor('household.remove', { id: lea.id }), { method: 'DELETE' })
    assert.isNull(await User.find(lea.id))
    const task = await Task.findByOrFail('title', 'Arroser')
    assert.isNull(task.createdById, 'what she did stays, unattributed')
  })
})

test.group('Household | who did what', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('tasks, shopping and expenses remember who did them', async ({ assert }) => {
    const { user: camille, browser } = await signedIn('camille4@paper.local', 'Camille')
    await browser.request(urlFor('lists'))

    await browser.submit(urlFor('tasks.store'), { title: 'Réparer le vélo' })
    const task = await Task.findByOrFail('title', 'Réparer le vélo')
    assert.equal(task.createdById, camille.id)
    await browser.request(urlFor('tasks.toggle', { id: task.id }), { method: 'PATCH' })
    await task.refresh()
    assert.equal(task.doneById, camille.id)

    await browser.submit(urlFor('shopping.store'), { label: 'Pain' })
    const lists = await browser.page(urlFor('lists'))
    const shopping = lists.props.shopping as Array<{ id: number; label: string }>
    const bread = shopping.find((item) => item.label === 'Pain')!
    await browser.request(urlFor('shopping.toggle', { id: bread.id }), { method: 'PATCH' })
    const listsAfter = await propsOf(browser, urlFor('lists'))
    const after = listsAfter.shopping as Array<{
      label: string
      checkedById: number | null
    }>
    assert.equal(after.find((item) => item.label === 'Pain')!.checkedById, camille.id)

    await browser.submit(urlFor('capture.commit'), { text: 'café 3 €' })
    const coffee = await Transaction.firstOrFail()
    assert.equal(coffee.createdById, camille.id)

    // Outside a request (scheduler, listeners): nobody.
    const automatic = await Task.create({ title: 'Payer la facture' })
    assert.isNull(automatic.createdById)
  })
})
