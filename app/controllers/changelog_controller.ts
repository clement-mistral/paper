import type { HttpContext } from '@adonisjs/core/http'
import { appCommit, appVersion, changelog } from '#support/release'

/**
 * « Nouveautés » : the running version and CHANGELOG.md.
 */
export default class ChangelogController {
  async index({ inertia }: HttpContext) {
    return inertia.render('changelog', {
      version: await appVersion(),
      commit: appCommit(),
      releases: await changelog(),
    })
  }
}
