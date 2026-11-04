import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AgendaView from '#views/agenda_view'

@inject()
export default class AgendaController {
  constructor(private agenda: AgendaView) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('agenda', { agenda: await this.agenda.agenda() })
  }
}
