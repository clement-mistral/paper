import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CaptureService from '#capture/capture_service'
import UndoService from '#capture/services/undo_service'
import { captureRequestValidator } from '#capture/validators/capture_request'

@inject()
export default class CaptureController {
  constructor(
    private capture: CaptureService,
    private undoer: UndoService
  ) {}

  /**
   * Called with `fetch` while the user types (not an Inertia visit).
   */
  async preview({ request, response }: HttpContext) {
    const payload = await request.validateUsing(captureRequestValidator)
    return response.json(await this.capture.preview(payload))
  }

  async commit({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(captureRequestValidator)
    const receipt = await this.capture.commit(payload)
    session.flash('capture', receipt)
    return response.redirect().back()
  }

  async undo({ params, response, session }: HttpContext) {
    session.flash('success', await this.undoer.undo(Number(params.id)))
    return response.redirect().back()
  }
}
