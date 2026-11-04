import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'today': { paramsTuple?: []; params?: {} }
    'agenda': { paramsTuple?: []; params?: {} }
    'money': { paramsTuple?: []; params?: {} }
    'money.income': { paramsTuple?: []; params?: {} }
    'money.income.store': { paramsTuple?: []; params?: {} }
    'money.transfer': { paramsTuple?: []; params?: {} }
    'money.transfer.store': { paramsTuple?: []; params?: {} }
    'money.transactions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lists': { paramsTuple?: []; params?: {} }
    'shopping.store': { paramsTuple?: []; params?: {} }
    'shopping.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shopping.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shopping.clear': { paramsTuple?: []; params?: {} }
    'pantry.store': { paramsTuple?: []; params?: {} }
    'pantry.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'pantry.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.store': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.items.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.items.toggle': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'tasks.items.destroy': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'newspapers.current': { paramsTuple?: []; params?: {} }
    'newspapers.tomorrow': { paramsTuple?: []; params?: {} }
    'newspapers.sources': { paramsTuple?: []; params?: {} }
    'newspapers.sources.store': { paramsTuple?: []; params?: {} }
    'newspapers.sources.suggest': { paramsTuple?: []; params?: {} }
    'newspapers.sources.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspapers.sources.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspapers.settings': { paramsTuple?: []; params?: {} }
    'newspapers.refresh': { paramsTuple?: []; params?: {} }
    'newspapers.show': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'newspapers.choice': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'newspapers.choice.save': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reports.current': { paramsTuple?: []; params?: {} }
    'reports.show': { paramsTuple: [ParamValue]; params: {'month': ParamValue} }
    'reviews.current': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reviews.expense': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reviews.money': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reviews.task': { paramsTuple: [ParamValue,ParamValue]; params: {'day': ParamValue,'id': ParamValue} }
    'reviews.meal': { paramsTuple: [ParamValue,ParamValue]; params: {'day': ParamValue,'id': ParamValue} }
    'reviews.habit': { paramsTuple: [ParamValue,ParamValue]; params: {'day': ParamValue,'id': ParamValue} }
    'reviews.journal': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reviews.complete': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'habits.store': { paramsTuple?: []; params?: {} }
    'habits.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'capture.preview': { paramsTuple?: []; params?: {} }
    'capture.commit': { paramsTuple?: []; params?: {} }
    'capture.undo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'fiches.index': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.create': { paramsTuple?: []; params?: {} }
    'accounts.store': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.index': { paramsTuple?: []; params?: {} }
    'envelopes.create': { paramsTuple?: []; params?: {} }
    'envelopes.store': { paramsTuple?: []; params?: {} }
    'envelopes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.index': { paramsTuple?: []; params?: {} }
    'recipes.create': { paramsTuple?: []; params?: {} }
    'recipes.import': { paramsTuple?: []; params?: {} }
    'recipes.import.store': { paramsTuple?: []; params?: {} }
    'recipes.plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.store': { paramsTuple?: []; params?: {} }
    'recipes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ingredients.index': { paramsTuple?: []; params?: {} }
    'ingredients.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ingredients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ingredients.substitutions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ingredients.substitutions.destroy': { paramsTuple: [ParamValue]; params: {'substitutionId': ParamValue} }
    'ingredients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.index': { paramsTuple?: []; params?: {} }
    'vehicles.create': { paramsTuple?: []; params?: {} }
    'vehicles.store': { paramsTuple?: []; params?: {} }
    'vehicles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.completion': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.index': { paramsTuple?: []; params?: {} }
    'subscriptions.create': { paramsTuple?: []; params?: {} }
    'subscriptions.store': { paramsTuple?: []; params?: {} }
    'subscriptions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.index': { paramsTuple?: []; params?: {} }
    'bills.create': { paramsTuple?: []; params?: {} }
    'bills.store': { paramsTuple?: []; params?: {} }
    'bills.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.pay': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.index': { paramsTuple?: []; params?: {} }
    'contracts.create': { paramsTuple?: []; params?: {} }
    'contracts.store': { paramsTuple?: []; params?: {} }
    'contracts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'homes.index': { paramsTuple?: []; params?: {} }
    'homes.create': { paramsTuple?: []; params?: {} }
    'homes.store': { paramsTuple?: []; params?: {} }
    'homes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'homes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'homes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'chores.store': { paramsTuple?: []; params?: {} }
    'chores.suggest': { paramsTuple?: []; params?: {} }
    'projects.create': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.items.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.items.toggle': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'projects.items.destroy': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'projects.expenses.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.expenses.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'transactionId': ParamValue} }
    'claims.create': { paramsTuple?: []; params?: {} }
    'claims.store': { paramsTuple?: []; params?: {} }
    'claims.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.completion': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.readings.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.readings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.password': { paramsTuple?: []; params?: {} }
    'changelog': { paramsTuple?: []; params?: {} }
    'design': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'today': { paramsTuple?: []; params?: {} }
    'agenda': { paramsTuple?: []; params?: {} }
    'money': { paramsTuple?: []; params?: {} }
    'money.income': { paramsTuple?: []; params?: {} }
    'money.transfer': { paramsTuple?: []; params?: {} }
    'lists': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspapers.current': { paramsTuple?: []; params?: {} }
    'newspapers.tomorrow': { paramsTuple?: []; params?: {} }
    'newspapers.sources': { paramsTuple?: []; params?: {} }
    'newspapers.show': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'newspapers.choice': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reports.current': { paramsTuple?: []; params?: {} }
    'reports.show': { paramsTuple: [ParamValue]; params: {'month': ParamValue} }
    'reviews.current': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'fiches.index': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.create': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.index': { paramsTuple?: []; params?: {} }
    'envelopes.create': { paramsTuple?: []; params?: {} }
    'envelopes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.index': { paramsTuple?: []; params?: {} }
    'recipes.create': { paramsTuple?: []; params?: {} }
    'recipes.import': { paramsTuple?: []; params?: {} }
    'recipes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ingredients.index': { paramsTuple?: []; params?: {} }
    'ingredients.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.index': { paramsTuple?: []; params?: {} }
    'vehicles.create': { paramsTuple?: []; params?: {} }
    'vehicles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.completion': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.index': { paramsTuple?: []; params?: {} }
    'subscriptions.create': { paramsTuple?: []; params?: {} }
    'subscriptions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.index': { paramsTuple?: []; params?: {} }
    'bills.create': { paramsTuple?: []; params?: {} }
    'bills.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.index': { paramsTuple?: []; params?: {} }
    'contracts.create': { paramsTuple?: []; params?: {} }
    'contracts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'homes.index': { paramsTuple?: []; params?: {} }
    'homes.create': { paramsTuple?: []; params?: {} }
    'homes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'homes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.create': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.create': { paramsTuple?: []; params?: {} }
    'claims.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.completion': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'changelog': { paramsTuple?: []; params?: {} }
    'design': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'today': { paramsTuple?: []; params?: {} }
    'agenda': { paramsTuple?: []; params?: {} }
    'money': { paramsTuple?: []; params?: {} }
    'money.income': { paramsTuple?: []; params?: {} }
    'money.transfer': { paramsTuple?: []; params?: {} }
    'lists': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspapers.current': { paramsTuple?: []; params?: {} }
    'newspapers.tomorrow': { paramsTuple?: []; params?: {} }
    'newspapers.sources': { paramsTuple?: []; params?: {} }
    'newspapers.show': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'newspapers.choice': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reports.current': { paramsTuple?: []; params?: {} }
    'reports.show': { paramsTuple: [ParamValue]; params: {'month': ParamValue} }
    'reviews.current': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'fiches.index': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.create': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.index': { paramsTuple?: []; params?: {} }
    'envelopes.create': { paramsTuple?: []; params?: {} }
    'envelopes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.index': { paramsTuple?: []; params?: {} }
    'recipes.create': { paramsTuple?: []; params?: {} }
    'recipes.import': { paramsTuple?: []; params?: {} }
    'recipes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ingredients.index': { paramsTuple?: []; params?: {} }
    'ingredients.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.index': { paramsTuple?: []; params?: {} }
    'vehicles.create': { paramsTuple?: []; params?: {} }
    'vehicles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.completion': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.index': { paramsTuple?: []; params?: {} }
    'subscriptions.create': { paramsTuple?: []; params?: {} }
    'subscriptions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.index': { paramsTuple?: []; params?: {} }
    'bills.create': { paramsTuple?: []; params?: {} }
    'bills.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.index': { paramsTuple?: []; params?: {} }
    'contracts.create': { paramsTuple?: []; params?: {} }
    'contracts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'homes.index': { paramsTuple?: []; params?: {} }
    'homes.create': { paramsTuple?: []; params?: {} }
    'homes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'homes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.create': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.create': { paramsTuple?: []; params?: {} }
    'claims.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.completion': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'changelog': { paramsTuple?: []; params?: {} }
    'design': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'money.income.store': { paramsTuple?: []; params?: {} }
    'money.transfer.store': { paramsTuple?: []; params?: {} }
    'shopping.store': { paramsTuple?: []; params?: {} }
    'pantry.store': { paramsTuple?: []; params?: {} }
    'tasks.store': { paramsTuple?: []; params?: {} }
    'tasks.items.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspapers.sources.store': { paramsTuple?: []; params?: {} }
    'newspapers.sources.suggest': { paramsTuple?: []; params?: {} }
    'newspapers.refresh': { paramsTuple?: []; params?: {} }
    'reviews.expense': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reviews.money': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reviews.task': { paramsTuple: [ParamValue,ParamValue]; params: {'day': ParamValue,'id': ParamValue} }
    'reviews.meal': { paramsTuple: [ParamValue,ParamValue]; params: {'day': ParamValue,'id': ParamValue} }
    'reviews.habit': { paramsTuple: [ParamValue,ParamValue]; params: {'day': ParamValue,'id': ParamValue} }
    'reviews.complete': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'habits.store': { paramsTuple?: []; params?: {} }
    'capture.preview': { paramsTuple?: []; params?: {} }
    'capture.commit': { paramsTuple?: []; params?: {} }
    'capture.undo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.store': { paramsTuple?: []; params?: {} }
    'envelopes.store': { paramsTuple?: []; params?: {} }
    'recipes.import.store': { paramsTuple?: []; params?: {} }
    'recipes.plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.store': { paramsTuple?: []; params?: {} }
    'ingredients.substitutions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.store': { paramsTuple?: []; params?: {} }
    'maintenances.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.store': { paramsTuple?: []; params?: {} }
    'bills.store': { paramsTuple?: []; params?: {} }
    'bills.pay': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.store': { paramsTuple?: []; params?: {} }
    'homes.store': { paramsTuple?: []; params?: {} }
    'chores.store': { paramsTuple?: []; params?: {} }
    'chores.suggest': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'projects.items.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.expenses.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.store': { paramsTuple?: []; params?: {} }
    'equipment.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.readings.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'money.transactions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shopping.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shopping.clear': { paramsTuple?: []; params?: {} }
    'pantry.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.items.destroy': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'newspapers.sources.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'habits.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ingredients.substitutions.destroy': { paramsTuple: [ParamValue]; params: {'substitutionId': ParamValue} }
    'ingredients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.items.destroy': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'projects.expenses.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'transactionId': ParamValue} }
    'claims.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.readings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'shopping.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'pantry.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.items.toggle': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'projects.items.toggle': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
  }
  PUT: {
    'tasks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspapers.sources.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspapers.settings': { paramsTuple?: []; params?: {} }
    'newspapers.choice.save': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'reviews.journal': { paramsTuple: [ParamValue]; params: {'day': ParamValue} }
    'accounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'envelopes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'recipes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ingredients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bills.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'contracts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'homes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'equipment_maintenances.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'circuits.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'meters.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.password': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}