/*
|--------------------------------------------------------------------------
| Cross-domain events
|--------------------------------------------------------------------------
|
| Side effects that are not critical to the action that triggered them
| (updating a list…). Money movements never go through events: they call
| the Budget services inside the same transaction.
|
*/

import emitter from '@adonisjs/core/services/emitter'

const AddMealToShoppingList = () => import('#domains/lists/listeners/add_meal_to_shopping_list')
const SyncAutomaticTasks = () => import('#domains/lists/listeners/sync_automatic_tasks')
const StockFromShopping = () => import('#domains/menu/listeners/stock_from_shopping')

declare module '@adonisjs/core/types' {
  interface EventsList {
    'menu:meal_planned': { mealPlanId: number }
    'menu:recipe_changed': { recipeId: number }
    'maison:bill_changed': { billId: number }
    'maison:contract_changed': { contractId: number }
    'lists:shopping_checked': {
      itemId: number
      label: string
      ingredientId: number | null
      quantity: number | null
      unit: string | null
      checked: boolean
    }
  }
}

emitter.on('menu:meal_planned', [AddMealToShoppingList])
emitter.on('menu:recipe_changed', [SyncAutomaticTasks])
emitter.on('maison:bill_changed', [SyncAutomaticTasks])
emitter.on('maison:contract_changed', [SyncAutomaticTasks])
emitter.on('lists:shopping_checked', [StockFromShopping])
