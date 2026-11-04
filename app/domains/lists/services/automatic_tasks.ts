import { inject } from '@adonisjs/core'
import BillService from '#domains/maison/services/bill_service'
import ContractService from '#domains/maison/services/contract_service'
import { NOTICE_WINDOW_DAYS } from '#domains/maison/services/contract_terms'
import RecipeService from '#domains/menu/services/recipe_service'
import TaskService, { type AutomaticTask } from '#domains/lists/services/task_service'
import { formatAmount, formatDate } from '#support/format'
import { fromIsoDate, today } from '#support/dates'

/**
 * Bills show up in « À faire » this many days before their due date.
 */
const BILL_NOTICE_DAYS = 3

/**
 * Tasks other domains need, read through their public services:
 * unpaid bills close to their due date, draft recipes to complete.
 */
@inject()
export default class AutomaticTasks {
  constructor(
    private tasks: TaskService,
    private bills: BillService,
    private recipes: RecipeService,
    private contracts: ContractService
  ) {}

  async sync() {
    const horizon = today().plus({ days: BILL_NOTICE_DAYS })
    const noticeHorizon = today().plus({ days: NOTICE_WINDOW_DAYS })
    const [bills, drafts, contracts] = await Promise.all([
      this.bills.unpaid(),
      this.recipes.drafts(),
      this.contracts.withNotice(),
    ])

    /**
     * One reminder per term: once a tacitly renewed contract enters a new
     * term, the reminder of the previous one is forgotten so that a new
     * one can be created.
     */
    for (const contract of contracts) {
      const existing = await this.tasks.automaticFor('contract', contract.id)
      if (existing && existing.dueOn !== contract.noticeBy) {
        await this.tasks.forgetAutomatic('contract', contract.id)
      }
    }

    const wanted: AutomaticTask[] = [
      ...bills
        .filter((bill) => fromIsoDate(bill.dueOn) <= horizon)
        .map((bill) => ({
          sourceType: 'bill',
          sourceId: bill.id,
          title: `Payer la facture ${bill.provider} (${formatAmount(bill.amountCents)})`,
          dueOn: bill.dueOn,
          domain: 'maison' as const,
        })),
      ...contracts
        .filter((contract) => fromIsoDate(contract.noticeBy!) <= noticeHorizon)
        .map((contract) => ({
          sourceType: 'contract',
          sourceId: contract.id,
          title: `Résilier ou renégocier « ${contract.name} » avant le ${formatDate(fromIsoDate(contract.noticeBy!))}`,
          dueOn: contract.noticeBy,
          domain: contract.domain,
        })),
      ...drafts.map((recipe) => ({
        sourceType: 'recipe',
        sourceId: recipe.id,
        title: `Compléter la recette « ${recipe.name} »`,
        dueOn: null,
        domain: 'menu' as const,
      })),
    ]

    /**
     * A bill not yet close to its due date is not « wanted », but its task
     * must not be checked either: only paid bills close their task.
     */
    const pendingBills = bills.map((bill) => ({
      sourceType: 'bill',
      sourceId: bill.id,
      title: '',
      dueOn: bill.dueOn,
      domain: 'maison' as const,
    }))

    /**
     * A contract whose notice is still far away keeps its reminder open
     * if the user created one ahead (never closes it by itself).
     */
    const pendingContracts = contracts.map((contract) => ({
      sourceType: 'contract',
      sourceId: contract.id,
      title: '',
      dueOn: contract.noticeBy,
      domain: contract.domain,
    }))

    await this.tasks.syncAutomatic(
      wanted,
      ['bill', 'recipe', 'contract'],
      [...pendingBills, ...pendingContracts]
    )
  }
}
