import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { Browser } from '#tests/helpers/browser'

function createUser(email = 'profil@paper.local') {
  return User.create({ fullName: 'Clément Test', email, password: 'secret123' })
}

async function tokenCount(user: User) {
  const [row] = await db
    .from('remember_me_tokens')
    .where('tokenable_id', user.id)
    .count('* as total')
  return Number(row.total)
}

test.group('Auth | remember me', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('« Se souvenir de moi » stores a remember me token', async ({ assert }) => {
    const user = await createUser()
    const browser = new Browser()
    await browser.login(user.email, 'secret123', true)

    assert.isTrue(browser.cookies.has('remember_web'))
    assert.equal(await tokenCount(user), 1)
  })

  test('without the checkbox, no token is created', async ({ assert }) => {
    const user = await createUser()
    const browser = new Browser()
    await browser.login(user.email, 'secret123')

    assert.isFalse(browser.cookies.has('remember_web'))
    assert.equal(await tokenCount(user), 0)
  })

  test('the remember me cookie logs in again once the session is gone', async ({ assert }) => {
    const user = await createUser()
    const browser = new Browser()
    await browser.login(user.email, 'secret123', true)

    for (const key of [...browser.cookies.keys()]) {
      if (key !== 'remember_web') browser.cookies.delete(key)
    }

    const page = await browser.page(urlFor('profile.show'))
    assert.equal(page.component, 'profile')
  })
})

test.group('Auth | profile', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('renders the profile page with the user', async ({ assert }) => {
    const user = await createUser()
    const browser = new Browser()
    await browser.login(user.email, 'secret123')

    const page = await browser.page(urlFor('profile.show'))
    assert.equal(page.component, 'profile')
    assert.containsSubset(page.props.user, {
      email: 'profil@paper.local',
      fullName: 'Clément Test',
    })
  })

  test('updates the name and the email', async ({ assert }) => {
    const user = await createUser()
    const browser = new Browser()
    await browser.login(user.email, 'secret123')

    const response = await browser.submit(
      urlFor('profile.update'),
      { fullName: 'Clément Nouveau', email: 'nouveau@paper.local' },
      'PUT'
    )
    assert.equal(response.status, 302)

    await user.refresh()
    assert.equal(user.fullName, 'Clément Nouveau')
    assert.equal(user.email, 'nouveau@paper.local')
  })

  test('keeps its own email but refuses the email of another user', async ({ assert }) => {
    const user = await createUser()
    await createUser('autre@paper.local')
    const browser = new Browser()
    await browser.login(user.email, 'secret123')

    await browser.submit(
      urlFor('profile.update'),
      { fullName: 'Clément', email: 'profil@paper.local' },
      'PUT'
    )
    await user.refresh()
    assert.equal(user.fullName, 'Clément')

    await browser.submit(
      urlFor('profile.update'),
      { fullName: 'Clément', email: 'AUTRE@paper.local' },
      'PUT'
    )
    const page = await browser.page(urlFor('profile.show'))
    assert.properties(page.props.errors as object, ['email'])
    await user.refresh()
    assert.equal(user.email, 'profil@paper.local')
  })

  test('refuses a wrong current password', async ({ assert }) => {
    const user = await createUser()
    const browser = new Browser()
    await browser.login(user.email, 'secret123')

    await browser.submit(
      urlFor('profile.password'),
      { currentPassword: 'wrong', password: 'nouveau123', passwordConfirmation: 'nouveau123' },
      'PUT'
    )
    const page = await browser.page(urlFor('profile.show'))
    assert.properties(page.props.errors as object, ['currentPassword'])
    await user.refresh()
    assert.isTrue(await hash.verify(user.password, 'secret123'))
  })

  test('changes the password and forgets the other devices', async ({ assert }) => {
    const user = await createUser()
    const other = new Browser()
    await other.login(user.email, 'secret123', true)
    const browser = new Browser()
    await browser.login(user.email, 'secret123')
    assert.equal(await tokenCount(user), 1)

    const response = await browser.submit(
      urlFor('profile.password'),
      { currentPassword: 'secret123', password: 'nouveau123', passwordConfirmation: 'nouveau123' },
      'PUT'
    )
    assert.equal(response.status, 302)

    await user.refresh()
    assert.isTrue(await hash.verify(user.password, 'nouveau123'))
    assert.equal(await tokenCount(user), 0)

    const page = await browser.page(urlFor('profile.show'))
    assert.equal(page.component, 'profile')
  })
})
