import { BaseCommand } from '@adonisjs/core/ace'
import { generateVapidKeys } from '#domains/notifications/web_push'

export default class PushKeys extends BaseCommand {
  static commandName = 'push:keys'
  static description = 'Generate the VAPID key used to send push notifications'

  async run() {
    const keys = generateVapidKeys()
    this.logger.info('Add this line to the environment file, then restart Paper:')
    this.logger.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
    this.logger.info(
      'Keep it: a new key invalidates the devices already subscribed (they must re-enable notifications).'
    )
  }
}
