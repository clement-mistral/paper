import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import SubscriptionService from '#domains/maison/services/subscription_service'

export default class SubscriptionsCharge extends BaseCommand {
  static commandName = 'subscriptions:charge'
  static description = 'Record the subscription debits that are due (idempotent)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const subscriptions = await this.app.container.make(SubscriptionService)
    const charged = await subscriptions.chargeDue()
    this.logger.success(`${charged} prélèvement(s) enregistré(s)`)
  }
}
