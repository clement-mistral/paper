/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| Pages are organised by dimension (Aujourd'hui, Agenda, Argent, Listes,
| Fiches), never by domain. URLs are in French, route names in English.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.get('/', [controllers.Today, 'index']).as('today')
    router.get('agenda', [controllers.Agenda, 'index']).as('agenda')
    router.get('argent', [controllers.Money, 'index']).as('money')
    router.get('argent/entree', [controllers.Money, 'incomeForm']).as('money.income')
    router.post('argent/entree', [controllers.Money, 'storeIncome']).as('money.income.store')
    router.get('argent/virement', [controllers.Money, 'transferForm']).as('money.transfer')
    router.post('argent/virement', [controllers.Money, 'storeTransfer']).as('money.transfer.store')
    router
      .delete('argent/transactions/:id', [controllers.Money, 'destroyTransaction'])
      .as('money.transactions.destroy')
      .where('id', router.matchers.number())
    router.get('listes', [controllers.Lists, 'index']).as('lists')
    router
      .group(() => {
        router.post('/', [controllers.Lists, 'store']).as('shopping.store')
        router.patch(':id/cocher', [controllers.Lists, 'toggle']).as('shopping.toggle')
        router.delete(':id', [controllers.Lists, 'destroy']).as('shopping.destroy')
        router.delete('/', [controllers.Lists, 'clearChecked']).as('shopping.clear')
      })
      .prefix('listes/courses')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.post('/', [controllers.Pantry, 'store']).as('pantry.store')
        router.patch(':id', [controllers.Pantry, 'update']).as('pantry.update')
        router.delete(':id', [controllers.Pantry, 'destroy']).as('pantry.destroy')
      })
      .prefix('listes/placards')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.post('/', [controllers.Tasks, 'store']).as('tasks.store')
        router.get(':id', [controllers.Tasks, 'show']).as('tasks.show')
        router.put(':id', [controllers.Tasks, 'update']).as('tasks.update')
        router.patch(':id/cocher', [controllers.Tasks, 'toggle']).as('tasks.toggle')
        router.delete(':id', [controllers.Tasks, 'destroy']).as('tasks.destroy')
        router.post(':id/elements', [controllers.Tasks, 'storeItem']).as('tasks.items.store')
        router.patch('elements/:itemId', [controllers.Tasks, 'toggleItem']).as('tasks.items.toggle')
        router
          .delete('elements/:itemId', [controllers.Tasks, 'destroyItem'])
          .as('tasks.items.destroy')
      })
      .prefix('listes/taches')
      .where('id', router.matchers.number())
      .where('itemId', router.matchers.number())

    router.get('journal', [controllers.Newspapers, 'current']).as('newspapers.current')
    router.get('journal/demain', [controllers.Newspapers, 'tomorrow']).as('newspapers.tomorrow')
    router.get('journal/sources', [controllers.Newspapers, 'sources']).as('newspapers.sources')
    router
      .post('journal/sources', [controllers.Newspapers, 'storeSource'])
      .as('newspapers.sources.store')
    router
      .post('journal/sources/suggestions', [controllers.Newspapers, 'storeSuggestion'])
      .as('newspapers.sources.suggest')
    router
      .put('journal/sources/:id', [controllers.Newspapers, 'updateSource'])
      .as('newspapers.sources.update')
      .where('id', router.matchers.number())
    router
      .delete('journal/sources/:id', [controllers.Newspapers, 'destroySource'])
      .as('newspapers.sources.destroy')
      .where('id', router.matchers.number())
    router
      .put('journal/reglages', [controllers.Newspapers, 'saveSettings'])
      .as('newspapers.settings')
    router.post('journal/actualiser', [controllers.Newspapers, 'refresh']).as('newspapers.refresh')
    router
      .group(() => {
        router.get('/', [controllers.Newspapers, 'show']).as('newspapers.show')
        router.get('choix', [controllers.Newspapers, 'choice']).as('newspapers.choice')
        router.put('choix', [controllers.Newspapers, 'saveChoice']).as('newspapers.choice.save')
      })
      .prefix('journal/:day')
      .where('day', /^\d{4}-\d{2}-\d{2}$/)

    router.get('compte-rendu', [controllers.Reports, 'current']).as('reports.current')
    router
      .get('compte-rendu/:month', [controllers.Reports, 'show'])
      .as('reports.show')
      .where('month', /^\d{4}-(0[1-9]|1[0-2])$/)

    router.get('bilan', [controllers.Reviews, 'current']).as('reviews.current')
    router
      .group(() => {
        router.get('/', [controllers.Reviews, 'show']).as('reviews.show')
        router.post('depenses', [controllers.Reviews, 'expense']).as('reviews.expense')
        router.post('argent', [controllers.Reviews, 'confirmMoney']).as('reviews.money')
        router.post('taches/:id', [controllers.Reviews, 'task']).as('reviews.task')
        router.post('repas/:id', [controllers.Reviews, 'meal']).as('reviews.meal')
        router.post('habitudes/:id', [controllers.Reviews, 'habit']).as('reviews.habit')
        router.put('journal', [controllers.Reviews, 'journal']).as('reviews.journal')
        router.post('valider', [controllers.Reviews, 'complete']).as('reviews.complete')
      })
      .prefix('bilan/:day')
      .where('day', /^\d{4}-\d{2}-\d{2}$/)
      .where('id', router.matchers.number())
    router.post('habitudes', [controllers.Reviews, 'storeHabit']).as('habits.store')
    router
      .delete('habitudes/:id', [controllers.Reviews, 'archiveHabit'])
      .as('habits.archive')
      .where('id', router.matchers.number())

    router.post('capture/preview', [controllers.Capture, 'preview'])
    router.post('capture/commit', [controllers.Capture, 'commit'])
    router
      .post('capture/:id/annuler', [controllers.Capture, 'undo'])
      .where('id', router.matchers.number())

    router.get('fiches', [controllers.Fiches, 'index'])

    router
      .group(() => {
        router.get('/', [controllers.Accounts, 'index'])
        router.get('nouveau', [controllers.Accounts, 'create'])
        router.post('/', [controllers.Accounts, 'store'])
        router.get(':id', [controllers.Accounts, 'show'])
        router.get(':id/modifier', [controllers.Accounts, 'edit'])
        router.put(':id', [controllers.Accounts, 'update'])
        router.delete(':id', [controllers.Accounts, 'destroy'])
      })
      .prefix('fiches/comptes')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get('/', [controllers.Portfolios, 'index'])
        router.get(':id', [controllers.Portfolios, 'show'])
        router
          .post(':id/operations', [controllers.Portfolios, 'storeOperation'])
          .as('portfolios.operations.store')
        router
          .delete('operations/:id', [controllers.Portfolios, 'destroyOperation'])
          .as('portfolios.operations.destroy')
        router.get('lignes/:id', [controllers.Portfolios, 'holding']).as('portfolios.holdings.show')
        router
          .put('lignes/:id', [controllers.Portfolios, 'updateHolding'])
          .as('portfolios.holdings.update')
        router
          .delete('lignes/:id', [controllers.Portfolios, 'destroyHolding'])
          .as('portfolios.holdings.destroy')
      })
      .prefix('fiches/placements')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get('/', [controllers.Envelopes, 'index'])
        router.get('nouveau', [controllers.Envelopes, 'create'])
        router.post('/', [controllers.Envelopes, 'store'])
        router.get(':id', [controllers.Envelopes, 'show'])
        router.get(':id/modifier', [controllers.Envelopes, 'edit'])
        router.put(':id', [controllers.Envelopes, 'update'])
        router.delete(':id', [controllers.Envelopes, 'destroy'])
      })
      .prefix('fiches/enveloppes')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get('/', [controllers.Recipes, 'index'])
        router.get('nouveau', [controllers.Recipes, 'create'])
        router.get('importer', [controllers.Recipes, 'importForm']).as('recipes.import')
        router.post('importer', [controllers.Recipes, 'import']).as('recipes.import.store')
        router.post(':id/planifier', [controllers.Recipes, 'plan']).as('recipes.plan')
        router.post('/', [controllers.Recipes, 'store'])
        router.get(':id', [controllers.Recipes, 'show'])
        router.get(':id/modifier', [controllers.Recipes, 'edit'])
        router.put(':id', [controllers.Recipes, 'update'])
        router.delete(':id', [controllers.Recipes, 'destroy'])
      })
      .prefix('fiches/recettes')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get('/', [controllers.Ingredients, 'index'])
        router.get(':id/modifier', [controllers.Ingredients, 'edit'])
        router.put(':id', [controllers.Ingredients, 'update'])
        router
          .post(':id/substituts', [controllers.Ingredients, 'storeSubstitution'])
          .as('ingredients.substitutions.store')
        router
          .delete('substituts/:substitutionId', [controllers.Ingredients, 'destroySubstitution'])
          .as('ingredients.substitutions.destroy')
          .where('substitutionId', router.matchers.number())
        router.delete(':id', [controllers.Ingredients, 'destroy'])
      })
      .prefix('fiches/ingredients')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get('/', [controllers.Vehicles, 'index'])
        router.get('nouveau', [controllers.Vehicles, 'create'])
        router.post('/', [controllers.Vehicles, 'store'])
        router.get(':id', [controllers.Vehicles, 'show'])
        router.get(':id/modifier', [controllers.Vehicles, 'edit'])
        router.put(':id', [controllers.Vehicles, 'update'])
        router.delete(':id', [controllers.Vehicles, 'destroy'])
      })
      .prefix('fiches/vehicules')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get(':id/entretiens/nouveau', [controllers.Maintenances, 'create'])
        router.post(':id/entretiens', [controllers.Maintenances, 'store'])
        router.get('entretiens/:id/modifier', [controllers.Maintenances, 'edit'])
        router.put('entretiens/:id', [controllers.Maintenances, 'update'])
        router.get('entretiens/:id/fait', [controllers.Maintenances, 'completion'])
        router.post('entretiens/:id/fait', [controllers.Maintenances, 'complete'])
        router.delete('entretiens/:id', [controllers.Maintenances, 'destroy'])
      })
      .prefix('fiches/vehicules')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get('/', [controllers.Subscriptions, 'index'])
        router.get('nouveau', [controllers.Subscriptions, 'create'])
        router.post('/', [controllers.Subscriptions, 'store'])
        router.get(':id', [controllers.Subscriptions, 'show'])
        router.get(':id/modifier', [controllers.Subscriptions, 'edit'])
        router.put(':id', [controllers.Subscriptions, 'update'])
        router.delete(':id', [controllers.Subscriptions, 'destroy'])
      })
      .prefix('fiches/abonnements')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get('/', [controllers.Bills, 'index'])
        router.get('nouveau', [controllers.Bills, 'create'])
        router.post('/', [controllers.Bills, 'store'])
        router.get(':id', [controllers.Bills, 'show'])
        router.get(':id/modifier', [controllers.Bills, 'edit'])
        router.put(':id', [controllers.Bills, 'update'])
        router.delete(':id', [controllers.Bills, 'destroy'])
        router.post(':id/payer', [controllers.Bills, 'pay'])
      })
      .prefix('fiches/factures')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get('/', [controllers.Contracts, 'index'])
        router.get('nouveau', [controllers.Contracts, 'create'])
        router.post('/', [controllers.Contracts, 'store'])
        router.get(':id', [controllers.Contracts, 'show'])
        router.get(':id/modifier', [controllers.Contracts, 'edit'])
        router.put(':id', [controllers.Contracts, 'update'])
        router.delete(':id', [controllers.Contracts, 'destroy'])
      })
      .prefix('fiches/contrats')
      .where('id', router.matchers.number())

    router
      .group(() => {
        router.get('/', [controllers.Homes, 'index'])
        router.get('nouveau', [controllers.Homes, 'create'])
        router.post('/', [controllers.Homes, 'store'])
        router.get(':id', [controllers.Homes, 'show'])
        router.get(':id/modifier', [controllers.Homes, 'edit'])
        router.put(':id', [controllers.Homes, 'update'])

        router.post('menage', [controllers.Chores, 'store']).as('chores.store')
        router.post('menage/suggestions', [controllers.Chores, 'suggest']).as('chores.suggest')

        router.get('travaux/nouveau', [controllers.Projects, 'create'])
        router.post('travaux', [controllers.Projects, 'store'])
        router.get('travaux/:id', [controllers.Projects, 'show'])
        router.get('travaux/:id/modifier', [controllers.Projects, 'edit'])
        router.put('travaux/:id', [controllers.Projects, 'update'])
        router.delete('travaux/:id', [controllers.Projects, 'destroy'])
        router
          .post('travaux/:id/elements', [controllers.Projects, 'storeItem'])
          .as('projects.items.store')
        router
          .patch('travaux/elements/:itemId', [controllers.Projects, 'toggleItem'])
          .as('projects.items.toggle')
          .where('itemId', router.matchers.number())
        router
          .delete('travaux/elements/:itemId', [controllers.Projects, 'destroyItem'])
          .as('projects.items.destroy')
          .where('itemId', router.matchers.number())
        router
          .post('travaux/:id/depenses', [controllers.Projects, 'storeExpense'])
          .as('projects.expenses.store')
        router
          .delete('travaux/:id/depenses/:transactionId', [controllers.Projects, 'destroyExpense'])
          .as('projects.expenses.destroy')
          .where('transactionId', router.matchers.number())

        router.get('sinistres/nouveau', [controllers.Claims, 'create'])
        router.post('sinistres', [controllers.Claims, 'store'])
        router.get('sinistres/:id', [controllers.Claims, 'show'])
        router.get('sinistres/:id/modifier', [controllers.Claims, 'edit'])
        router.put('sinistres/:id', [controllers.Claims, 'update'])
        router.delete('sinistres/:id', [controllers.Claims, 'destroy'])

        router.get(':id/equipements/nouveau', [controllers.Equipment, 'create'])
        router.post(':id/equipements', [controllers.Equipment, 'store'])
        router.get('equipements/:id', [controllers.Equipment, 'show'])
        router.get('equipements/:id/modifier', [controllers.Equipment, 'edit'])
        router.put('equipements/:id', [controllers.Equipment, 'update'])
        router.delete('equipements/:id', [controllers.Equipment, 'destroy'])

        router.get('equipements/:id/entretiens/nouveau', [
          controllers.EquipmentMaintenances,
          'create',
        ])
        router.post('equipements/:id/entretiens', [controllers.EquipmentMaintenances, 'store'])
        router.get('entretiens/:id/modifier', [controllers.EquipmentMaintenances, 'edit'])
        router.put('entretiens/:id', [controllers.EquipmentMaintenances, 'update'])
        router.get('entretiens/:id/fait', [controllers.EquipmentMaintenances, 'completion'])
        router.post('entretiens/:id/fait', [controllers.EquipmentMaintenances, 'complete'])
        router.delete('entretiens/:id', [controllers.EquipmentMaintenances, 'destroy'])

        router.get(':id/circuits/nouveau', [controllers.Circuits, 'create'])
        router.post(':id/circuits', [controllers.Circuits, 'store'])
        router.get('circuits/:id/modifier', [controllers.Circuits, 'edit'])
        router.put('circuits/:id', [controllers.Circuits, 'update'])
        router.delete('circuits/:id', [controllers.Circuits, 'destroy'])

        router.get(':id/compteurs/nouveau', [controllers.Meters, 'create'])
        router.post(':id/compteurs', [controllers.Meters, 'store'])
        router.get('compteurs/:id', [controllers.Meters, 'show'])
        router.get('compteurs/:id/modifier', [controllers.Meters, 'edit'])
        router.put('compteurs/:id', [controllers.Meters, 'update'])
        router.delete('compteurs/:id', [controllers.Meters, 'destroy'])
        router
          .post('compteurs/:id/releves', [controllers.Meters, 'storeReading'])
          .as('meters.readings.store')
        router
          .delete('releves/:id', [controllers.Meters, 'destroyReading'])
          .as('meters.readings.destroy')
      })
      .prefix('fiches/logement')
      .where('id', router.matchers.number())

    router.get('profil', [controllers.Profile, 'show']).as('profile.show')
    router.put('profil', [controllers.Profile, 'update']).as('profile.update')
    router
      .put('profil/mot-de-passe', [controllers.Profile, 'updatePassword'])
      .as('profile.password')
    router
      .group(() => {
        router
          .post('appareils', [controllers.Notifications, 'subscribe'])
          .as('notifications.subscribe')
        router
          .post('appareils/retirer', [controllers.Notifications, 'unsubscribe'])
          .as('notifications.unsubscribe')
        router
          .delete('appareils/:id', [controllers.Notifications, 'destroyDevice'])
          .as('notifications.devices.destroy')
        router.post('test', [controllers.Notifications, 'test']).as('notifications.test')
        router
          .put('rappels', [controllers.Notifications, 'updateReminders'])
          .as('notifications.reminders')
      })
      .prefix('profil/notifications')
      .where('id', router.matchers.number())

    router.get('nouveautes', [controllers.Changelog, 'index']).as('changelog')

    router.on('/design').renderInertia('design', {}).as('design')

    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())
