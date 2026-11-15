import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import User from '#models/user'
import PushService from '#domains/notifications/services/push_service'
import DeadlineReminders from '#domains/notifications/services/deadline_reminders'
import BillService from '#domains/maison/services/bill_service'
import TaskService from '#domains/lists/services/task_service'
import { today, toIsoDate } from '#support/dates'
import { formatAmount } from '#support/format'
import { Browser } from '#tests/helpers/browser'
import type { NotificationsPanel, PushMessage } from '#shared/types/notifications'

class FakePush extends PushService {
  sent: PushMessage[] = []
  get configured() {
    return true
  }
  async sendToUser(_userId: number, message: PushMessage) {
    this.sent.push(message)
    return 1
  }
}

test.group('Notifications | deadline reminders', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('each stage of a deadline is sent once, in one daily digest', async ({
    assert,
    cleanup,
  }) => {
    const fake = new FakePush()
    app.container.swap(PushService, () => fake)
    cleanup(() => app.container.restore(PushService))

    const bills = await app.container.make(BillService)
    const tasks = await app.container.make(TaskService)
    const day = today()
    const bill = await bills.create({
      provider: 'EDF',
      amountCents: 8200,
      dueOn: toIsoDate(day.plus({ days: 7 })),
    })
    await tasks.create({ title: 'Appeler le plombier', dueOn: toIsoDate(day) })
    const timed = await tasks.create({
      title: 'Rendez-vous banque',
      dueOn: toIsoDate(day),
      dueTime: '14:00',
    })

    const reminders = await app.container.make(DeadlineReminders)
    const me = await User.create({ email: 'digest@paper.local', password: 'secret123' })
    assert.equal(await reminders.runFor(me.id, day.set({ hour: 8, minute: 55 })), 0)
    assert.equal(await reminders.run(day.set({ hour: 9, minute: 5 })), 1)
    assert.equal(await reminders.run(day.set({ hour: 9, minute: 10 })), 0)
    assert.lengthOf(fake.sent, 1)
    assert.equal(fake.sent[0].title, '2 échéances')
    assert.deepEqual(fake.sent[0].body.split('\n'), [
      'Appeler le plombier : aujourd’hui',
      'Facture EDF : dans 7 jours',
    ])
    assert.equal(fake.sent[0].tag, 'echeances')

    // The timed task: its own alert, 15 minutes before.
    assert.equal(await reminders.run(day.set({ hour: 13, minute: 50 })), 1)
    assert.equal(await reminders.run(day.set({ hour: 13, minute: 55 })), 0)
    assert.deepEqual(fake.sent[1], {
      title: 'Rendez-vous banque',
      body: 'Prévu à 14:00',
      url: urlFor('tasks.show', { id: timed.id }),
      tag: `tache-${timed.id}`,
    })

    // Days later: the bill again the day before, nothing new in between.
    assert.equal(await reminders.run(day.plus({ days: 3 }).set({ hour: 9, minute: 5 })), 0)
    assert.equal(await reminders.run(day.plus({ days: 6 }).set({ hour: 9, minute: 5 })), 1)
    assert.equal(fake.sent[2].title, 'Facture EDF')
    assert.equal(fake.sent[2].body, `Demain · ${formatAmount(8200)} à payer`)
    assert.equal(fake.sent[2].url, urlFor('bills.show', { id: bill.id }))
    assert.notInclude(
      fake.sent.map((message) => message.body).join('\n'),
      'Payer la facture',
      'the automatic task of the bill is not reminded twice'
    )
  })

  test('nothing is sent when disabled', async ({ assert, cleanup }) => {
    const fake = new FakePush()
    app.container.swap(PushService, () => fake)
    cleanup(() => app.container.restore(PushService))

    const tasks = await app.container.make(TaskService)
    await tasks.create({ title: 'Sortir les poubelles', dueOn: toIsoDate(today()) })
    const reminders = await app.container.make(DeadlineReminders)
    const me = await User.create({ email: 'off@paper.local', password: 'secret123' })
    await reminders.saveSettings(me.id, {
      enabled: false,
      sendTime: '09:00',
      leadDays: 7,
      taskAlerts: true,
    })
    assert.equal(await reminders.run(today().set({ hour: 10 })), 0)
    assert.lengthOf(fake.sent, 0)
  })

  test('the settings are saved from the profile', async ({ assert }) => {
    await User.create({ email: 'deadlines@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('deadlines@paper.local', 'secret123')

    let page = await browser.page(urlFor('profile.show'))
    assert.deepEqual((page.props.notifications as NotificationsPanel).deadlines, {
      enabled: true,
      sendTime: '09:00',
      leadDays: 7,
      taskAlerts: true,
    })

    const response = await browser.submit(
      urlFor('notifications.deadlines'),
      { enabled: 'true', sendTime: '08:15', leadDays: '14' },
      'PUT'
    )
    assert.equal(response.status, 302)

    page = await browser.page(urlFor('profile.show'))
    assert.deepEqual((page.props.notifications as NotificationsPanel).deadlines, {
      enabled: true,
      sendTime: '08:15',
      leadDays: 14,
      taskAlerts: false,
    })
  })
})
