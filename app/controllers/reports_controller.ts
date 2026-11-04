import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import MonthlyReportView from '#views/monthly_report_view'
import { today } from '#support/dates'

/**
 * « Compte rendu du mois » : an A4 sheet, printed or saved as PDF by the
 * browser.
 */
@inject()
export default class ReportsController {
  constructor(private reports: MonthlyReportView) {}

  /**
   * The month just ended; the current one from the 25th on.
   */
  async current({ response }: HttpContext) {
    const day = today()
    const month = day.day >= 25 ? day : day.minus({ months: 1 })
    return response.redirect().toRoute('reports.show', { month: month.toFormat('yyyy-LL') })
  }

  async show({ inertia, params, auth }: HttpContext) {
    const report = await this.reports.report(String(params.month), auth.user?.fullName ?? null)
    return inertia.render('report', { report })
  }
}
