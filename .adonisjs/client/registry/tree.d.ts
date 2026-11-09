/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  today: typeof routes['today']
  agenda: typeof routes['agenda']
  money: typeof routes['money'] & {
    income: typeof routes['money.income'] & {
      store: typeof routes['money.income.store']
    }
    transfer: typeof routes['money.transfer'] & {
      store: typeof routes['money.transfer.store']
    }
    transactions: {
      destroy: typeof routes['money.transactions.destroy']
    }
  }
  lists: typeof routes['lists']
  shopping: {
    store: typeof routes['shopping.store']
    toggle: typeof routes['shopping.toggle']
    destroy: typeof routes['shopping.destroy']
    clear: typeof routes['shopping.clear']
  }
  pantry: {
    store: typeof routes['pantry.store']
    update: typeof routes['pantry.update']
    destroy: typeof routes['pantry.destroy']
  }
  tasks: {
    store: typeof routes['tasks.store']
    show: typeof routes['tasks.show']
    update: typeof routes['tasks.update']
    toggle: typeof routes['tasks.toggle']
    destroy: typeof routes['tasks.destroy']
    items: {
      store: typeof routes['tasks.items.store']
      toggle: typeof routes['tasks.items.toggle']
      destroy: typeof routes['tasks.items.destroy']
    }
  }
  newspapers: {
    current: typeof routes['newspapers.current']
    tomorrow: typeof routes['newspapers.tomorrow']
    sources: typeof routes['newspapers.sources'] & {
      store: typeof routes['newspapers.sources.store']
      suggest: typeof routes['newspapers.sources.suggest']
      update: typeof routes['newspapers.sources.update']
      destroy: typeof routes['newspapers.sources.destroy']
    }
    settings: typeof routes['newspapers.settings']
    refresh: typeof routes['newspapers.refresh']
    show: typeof routes['newspapers.show']
    choice: typeof routes['newspapers.choice'] & {
      save: typeof routes['newspapers.choice.save']
    }
  }
  reports: {
    current: typeof routes['reports.current']
    show: typeof routes['reports.show']
  }
  reviews: {
    current: typeof routes['reviews.current']
    show: typeof routes['reviews.show']
    expense: typeof routes['reviews.expense']
    money: typeof routes['reviews.money']
    task: typeof routes['reviews.task']
    meal: typeof routes['reviews.meal']
    habit: typeof routes['reviews.habit']
    journal: typeof routes['reviews.journal']
    complete: typeof routes['reviews.complete']
  }
  habits: {
    store: typeof routes['habits.store']
    archive: typeof routes['habits.archive']
  }
  capture: {
    preview: typeof routes['capture.preview']
    commit: typeof routes['capture.commit']
    undo: typeof routes['capture.undo']
  }
  fiches: {
    index: typeof routes['fiches.index']
  }
  accounts: {
    index: typeof routes['accounts.index']
    create: typeof routes['accounts.create']
    store: typeof routes['accounts.store']
    show: typeof routes['accounts.show']
    edit: typeof routes['accounts.edit']
    update: typeof routes['accounts.update']
    destroy: typeof routes['accounts.destroy']
  }
  envelopes: {
    index: typeof routes['envelopes.index']
    create: typeof routes['envelopes.create']
    store: typeof routes['envelopes.store']
    show: typeof routes['envelopes.show']
    edit: typeof routes['envelopes.edit']
    update: typeof routes['envelopes.update']
    destroy: typeof routes['envelopes.destroy']
  }
  recipes: {
    index: typeof routes['recipes.index']
    create: typeof routes['recipes.create']
    import: typeof routes['recipes.import'] & {
      store: typeof routes['recipes.import.store']
    }
    plan: typeof routes['recipes.plan']
    store: typeof routes['recipes.store']
    show: typeof routes['recipes.show']
    edit: typeof routes['recipes.edit']
    update: typeof routes['recipes.update']
    destroy: typeof routes['recipes.destroy']
  }
  ingredients: {
    index: typeof routes['ingredients.index']
    edit: typeof routes['ingredients.edit']
    update: typeof routes['ingredients.update']
    substitutions: {
      store: typeof routes['ingredients.substitutions.store']
      destroy: typeof routes['ingredients.substitutions.destroy']
    }
    destroy: typeof routes['ingredients.destroy']
  }
  vehicles: {
    index: typeof routes['vehicles.index']
    create: typeof routes['vehicles.create']
    store: typeof routes['vehicles.store']
    show: typeof routes['vehicles.show']
    edit: typeof routes['vehicles.edit']
    update: typeof routes['vehicles.update']
    destroy: typeof routes['vehicles.destroy']
  }
  maintenances: {
    create: typeof routes['maintenances.create']
    store: typeof routes['maintenances.store']
    edit: typeof routes['maintenances.edit']
    update: typeof routes['maintenances.update']
    completion: typeof routes['maintenances.completion']
    complete: typeof routes['maintenances.complete']
    destroy: typeof routes['maintenances.destroy']
  }
  subscriptions: {
    index: typeof routes['subscriptions.index']
    create: typeof routes['subscriptions.create']
    store: typeof routes['subscriptions.store']
    show: typeof routes['subscriptions.show']
    edit: typeof routes['subscriptions.edit']
    update: typeof routes['subscriptions.update']
    destroy: typeof routes['subscriptions.destroy']
  }
  bills: {
    index: typeof routes['bills.index']
    create: typeof routes['bills.create']
    store: typeof routes['bills.store']
    show: typeof routes['bills.show']
    edit: typeof routes['bills.edit']
    update: typeof routes['bills.update']
    destroy: typeof routes['bills.destroy']
    pay: typeof routes['bills.pay']
  }
  contracts: {
    index: typeof routes['contracts.index']
    create: typeof routes['contracts.create']
    store: typeof routes['contracts.store']
    show: typeof routes['contracts.show']
    edit: typeof routes['contracts.edit']
    update: typeof routes['contracts.update']
    destroy: typeof routes['contracts.destroy']
  }
  homes: {
    index: typeof routes['homes.index']
    create: typeof routes['homes.create']
    store: typeof routes['homes.store']
    show: typeof routes['homes.show']
    edit: typeof routes['homes.edit']
    update: typeof routes['homes.update']
  }
  chores: {
    store: typeof routes['chores.store']
    suggest: typeof routes['chores.suggest']
  }
  projects: {
    create: typeof routes['projects.create']
    store: typeof routes['projects.store']
    show: typeof routes['projects.show']
    edit: typeof routes['projects.edit']
    update: typeof routes['projects.update']
    destroy: typeof routes['projects.destroy']
    items: {
      store: typeof routes['projects.items.store']
      toggle: typeof routes['projects.items.toggle']
      destroy: typeof routes['projects.items.destroy']
    }
    expenses: {
      store: typeof routes['projects.expenses.store']
      destroy: typeof routes['projects.expenses.destroy']
    }
  }
  claims: {
    create: typeof routes['claims.create']
    store: typeof routes['claims.store']
    show: typeof routes['claims.show']
    edit: typeof routes['claims.edit']
    update: typeof routes['claims.update']
    destroy: typeof routes['claims.destroy']
  }
  equipment: {
    create: typeof routes['equipment.create']
    store: typeof routes['equipment.store']
    show: typeof routes['equipment.show']
    edit: typeof routes['equipment.edit']
    update: typeof routes['equipment.update']
    destroy: typeof routes['equipment.destroy']
  }
  equipmentMaintenances: {
    create: typeof routes['equipment_maintenances.create']
    store: typeof routes['equipment_maintenances.store']
    edit: typeof routes['equipment_maintenances.edit']
    update: typeof routes['equipment_maintenances.update']
    completion: typeof routes['equipment_maintenances.completion']
    complete: typeof routes['equipment_maintenances.complete']
    destroy: typeof routes['equipment_maintenances.destroy']
  }
  circuits: {
    create: typeof routes['circuits.create']
    store: typeof routes['circuits.store']
    edit: typeof routes['circuits.edit']
    update: typeof routes['circuits.update']
    destroy: typeof routes['circuits.destroy']
  }
  meters: {
    create: typeof routes['meters.create']
    store: typeof routes['meters.store']
    show: typeof routes['meters.show']
    edit: typeof routes['meters.edit']
    update: typeof routes['meters.update']
    destroy: typeof routes['meters.destroy']
    readings: {
      store: typeof routes['meters.readings.store']
      destroy: typeof routes['meters.readings.destroy']
    }
  }
  profile: {
    show: typeof routes['profile.show']
    update: typeof routes['profile.update']
    password: typeof routes['profile.password']
  }
  notifications: {
    subscribe: typeof routes['notifications.subscribe']
    unsubscribe: typeof routes['notifications.unsubscribe']
    devices: {
      destroy: typeof routes['notifications.devices.destroy']
    }
    test: typeof routes['notifications.test']
    reminders: typeof routes['notifications.reminders']
  }
  changelog: typeof routes['changelog']
  design: typeof routes['design']
}
