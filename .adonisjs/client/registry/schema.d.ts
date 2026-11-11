/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse, Method, PathWithRegistry, PatternsByMethod, RouteWithRegistry } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'
import type { routes } from './index.ts'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'new_account.create': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'today': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/today_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/today_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/today_controller').default['index']>>>
    }
  }
  'agenda': {
    methods: ["GET","HEAD"]
    pattern: '/agenda'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agenda_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agenda_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/agenda_controller').default['index']>>>
    }
  }
  'money': {
    methods: ["GET","HEAD"]
    pattern: '/argent'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/money_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/money_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/money_controller').default['index']>>>
    }
  }
  'money.income': {
    methods: ["GET","HEAD"]
    pattern: '/argent/entree'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/money_controller').default['incomeForm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/money_controller').default['incomeForm']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/money_controller').default['incomeForm']>>>
    }
  }
  'money.income.store': {
    methods: ["POST"]
    pattern: '/argent/entree'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/budget/validators/money').incomeFormValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/budget/validators/money').incomeFormValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/money_controller').default['storeIncome']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/money_controller').default['storeIncome']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/money_controller').default['storeIncome']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'money.transfer': {
    methods: ["GET","HEAD"]
    pattern: '/argent/virement'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/money_controller').default['transferForm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/money_controller').default['transferForm']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/money_controller').default['transferForm']>>>
    }
  }
  'money.transfer.store': {
    methods: ["POST"]
    pattern: '/argent/virement'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/budget/validators/money').transferFormValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/budget/validators/money').transferFormValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/money_controller').default['storeTransfer']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/money_controller').default['storeTransfer']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/money_controller').default['storeTransfer']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'money.transactions.destroy': {
    methods: ["DELETE"]
    pattern: '/argent/transactions/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/money_controller').default['destroyTransaction']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/money_controller').default['destroyTransaction']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/money_controller').default['destroyTransaction']>>>
    }
  }
  'lists': {
    methods: ["GET","HEAD"]
    pattern: '/listes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['index']>>>
    }
  }
  'shopping.store': {
    methods: ["POST"]
    pattern: '/listes/courses'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/lists/validators/shopping').shoppingItemValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/lists/validators/shopping').shoppingItemValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'shopping.toggle': {
    methods: ["PATCH"]
    pattern: '/listes/courses/:id/cocher'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['toggle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['toggle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['toggle']>>>
    }
  }
  'shopping.destroy': {
    methods: ["DELETE"]
    pattern: '/listes/courses/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['destroy']>>>
    }
  }
  'shopping.clear': {
    methods: ["DELETE"]
    pattern: '/listes/courses'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['clearChecked']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['clearChecked']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/lists_controller').default['clearChecked']>>>
    }
  }
  'pantry.store': {
    methods: ["POST"]
    pattern: '/listes/placards'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/menu/validators/pantry').pantryValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/menu/validators/pantry').pantryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pantry_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pantry_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pantry_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'pantry.update': {
    methods: ["PATCH"]
    pattern: '/listes/placards/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/menu/validators/pantry').pantryUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/menu/validators/pantry').pantryUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pantry_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pantry_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pantry_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'pantry.destroy': {
    methods: ["DELETE"]
    pattern: '/listes/placards/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pantry_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pantry_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pantry_controller').default['destroy']>>>
    }
  }
  'tasks.store': {
    methods: ["POST"]
    pattern: '/listes/taches'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/lists/validators/task').taskValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/lists/validators/task').taskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tasks.show': {
    methods: ["GET","HEAD"]
    pattern: '/listes/taches/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['show']>>>
    }
  }
  'tasks.update': {
    methods: ["PUT"]
    pattern: '/listes/taches/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/lists/validators/task').taskFormValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/lists/validators/task').taskFormValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tasks.toggle': {
    methods: ["PATCH"]
    pattern: '/listes/taches/:id/cocher'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['toggle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['toggle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['toggle']>>>
    }
  }
  'tasks.destroy': {
    methods: ["DELETE"]
    pattern: '/listes/taches/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['destroy']>>>
    }
  }
  'tasks.items.store': {
    methods: ["POST"]
    pattern: '/listes/taches/:id/elements'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/lists/validators/task').taskItemValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/lists/validators/task').taskItemValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['storeItem']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['storeItem']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['storeItem']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tasks.items.toggle': {
    methods: ["PATCH"]
    pattern: '/listes/taches/elements/:itemId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { itemId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['toggleItem']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['toggleItem']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['toggleItem']>>>
    }
  }
  'tasks.items.destroy': {
    methods: ["DELETE"]
    pattern: '/listes/taches/elements/:itemId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { itemId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['destroyItem']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['destroyItem']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['destroyItem']>>>
    }
  }
  'newspapers.current': {
    methods: ["GET","HEAD"]
    pattern: '/journal'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['current']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['current']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['current']>>>
    }
  }
  'newspapers.tomorrow': {
    methods: ["GET","HEAD"]
    pattern: '/journal/demain'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['tomorrow']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['tomorrow']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['tomorrow']>>>
    }
  }
  'newspapers.sources': {
    methods: ["GET","HEAD"]
    pattern: '/journal/sources'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['sources']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['sources']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['sources']>>>
    }
  }
  'newspapers.sources.store': {
    methods: ["POST"]
    pattern: '/journal/sources'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/news/validators/news').newsSourceValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/news/validators/news').newsSourceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['storeSource']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['storeSource']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['storeSource']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspapers.sources.suggest': {
    methods: ["POST"]
    pattern: '/journal/sources/suggestions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['storeSuggestion']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['storeSuggestion']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['storeSuggestion']>>>
    }
  }
  'newspapers.sources.update': {
    methods: ["PUT"]
    pattern: '/journal/sources/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/news/validators/news').newsSourceUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/news/validators/news').newsSourceUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['updateSource']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['updateSource']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['updateSource']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspapers.sources.destroy': {
    methods: ["DELETE"]
    pattern: '/journal/sources/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['destroySource']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['destroySource']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['destroySource']>>>
    }
  }
  'newspapers.settings': {
    methods: ["PUT"]
    pattern: '/journal/reglages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/news/validators/news').newspaperSettingsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/news/validators/news').newspaperSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['saveSettings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['saveSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['saveSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspapers.refresh': {
    methods: ["POST"]
    pattern: '/journal/actualiser'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['refresh']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['refresh']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['refresh']>>>
    }
  }
  'newspapers.show': {
    methods: ["GET","HEAD"]
    pattern: '/journal/:day'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { day: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['show']>>>
    }
  }
  'newspapers.choice': {
    methods: ["GET","HEAD"]
    pattern: '/journal/:day/choix'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { day: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['choice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['choice']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['choice']>>>
    }
  }
  'newspapers.choice.save': {
    methods: ["PUT"]
    pattern: '/journal/:day/choix'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/news/validators/news').newsPicksValidator)>>
      paramsTuple: [ParamValue]
      params: { day: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/news/validators/news').newsPicksValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['saveChoice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['saveChoice']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/newspapers_controller').default['saveChoice']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'reports.current': {
    methods: ["GET","HEAD"]
    pattern: '/compte-rendu'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['current']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['current']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['current']>>>
    }
  }
  'reports.show': {
    methods: ["GET","HEAD"]
    pattern: '/compte-rendu/:month'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { month: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['show']>>>
    }
  }
  'reviews.current': {
    methods: ["GET","HEAD"]
    pattern: '/bilan'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['current']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['current']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['current']>>>
    }
  }
  'reviews.show': {
    methods: ["GET","HEAD"]
    pattern: '/bilan/:day'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { day: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['show']>>>
    }
  }
  'reviews.expense': {
    methods: ["POST"]
    pattern: '/bilan/:day/depenses'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/routine/validators/review').reviewExpenseValidator)>>
      paramsTuple: [ParamValue]
      params: { day: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/routine/validators/review').reviewExpenseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['expense']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['expense']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['expense']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'reviews.money': {
    methods: ["POST"]
    pattern: '/bilan/:day/argent'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { day: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['confirmMoney']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['confirmMoney']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['confirmMoney']>>>
    }
  }
  'reviews.task': {
    methods: ["POST"]
    pattern: '/bilan/:day/taches/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/routine/validators/review').reviewTaskValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { day: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/routine/validators/review').reviewTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['task']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['task']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['task']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'reviews.meal': {
    methods: ["POST"]
    pattern: '/bilan/:day/repas/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/routine/validators/review').reviewMealValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { day: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/routine/validators/review').reviewMealValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['meal']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['meal']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['meal']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'reviews.habit': {
    methods: ["POST"]
    pattern: '/bilan/:day/habitudes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { day: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['habit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['habit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['habit']>>>
    }
  }
  'reviews.journal': {
    methods: ["PUT"]
    pattern: '/bilan/:day/journal'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/routine/validators/review').reviewJournalValidator)>>
      paramsTuple: [ParamValue]
      params: { day: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/routine/validators/review').reviewJournalValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['journal']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['journal']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['journal']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'reviews.complete': {
    methods: ["POST"]
    pattern: '/bilan/:day/valider'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { day: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['complete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['complete']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['complete']>>>
    }
  }
  'habits.store': {
    methods: ["POST"]
    pattern: '/habitudes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/routine/validators/review').habitValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/routine/validators/review').habitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['storeHabit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['storeHabit']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['storeHabit']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'habits.archive': {
    methods: ["DELETE"]
    pattern: '/habitudes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['archiveHabit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['archiveHabit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reviews_controller').default['archiveHabit']>>>
    }
  }
  'capture.preview': {
    methods: ["POST"]
    pattern: '/capture/preview'
    types: {
      body: ExtractBody<InferInput<(typeof import('#capture/validators/capture_request').captureRequestValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#capture/validators/capture_request').captureRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/capture_controller').default['preview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/capture_controller').default['preview']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/capture_controller').default['preview']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'capture.commit': {
    methods: ["POST"]
    pattern: '/capture/commit'
    types: {
      body: ExtractBody<InferInput<(typeof import('#capture/validators/capture_request').captureRequestValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#capture/validators/capture_request').captureRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/capture_controller').default['commit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/capture_controller').default['commit']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/capture_controller').default['commit']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'capture.undo': {
    methods: ["POST"]
    pattern: '/capture/:id/annuler'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/capture_controller').default['undo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/capture_controller').default['undo']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/capture_controller').default['undo']>>>
    }
  }
  'fiches.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/fiches_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/fiches_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/fiches_controller').default['index']>>>
    }
  }
  'accounts.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/comptes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['index']>>>
    }
  }
  'accounts.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/comptes/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['create']>>>
    }
  }
  'accounts.store': {
    methods: ["POST"]
    pattern: '/fiches/comptes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/budget/validators/account').accountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/budget/validators/account').accountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/comptes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['show']>>>
    }
  }
  'accounts.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/comptes/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['edit']>>>
    }
  }
  'accounts.update': {
    methods: ["PUT"]
    pattern: '/fiches/comptes/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/budget/validators/account').accountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/budget/validators/account').accountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/comptes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['destroy']>>>
    }
  }
  'portfolios.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/placements'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['index']>>>
    }
  }
  'portfolios.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/placements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['show']>>>
    }
  }
  'portfolios.operations.store': {
    methods: ["POST"]
    pattern: '/fiches/placements/:id/operations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/budget/validators/portfolio').operationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/budget/validators/portfolio').operationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['storeOperation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['storeOperation']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['storeOperation']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'portfolios.operations.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/placements/operations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['destroyOperation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['destroyOperation']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['destroyOperation']>>>
    }
  }
  'portfolios.holdings.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/placements/lignes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['holding']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['holding']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['holding']>>>
    }
  }
  'portfolios.holdings.update': {
    methods: ["PUT"]
    pattern: '/fiches/placements/lignes/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/budget/validators/portfolio').holdingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/budget/validators/portfolio').holdingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['updateHolding']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['updateHolding']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['updateHolding']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'portfolios.holdings.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/placements/lignes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['destroyHolding']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['destroyHolding']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/portfolios_controller').default['destroyHolding']>>>
    }
  }
  'envelopes.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/enveloppes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['index']>>>
    }
  }
  'envelopes.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/enveloppes/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['create']>>>
    }
  }
  'envelopes.store': {
    methods: ["POST"]
    pattern: '/fiches/enveloppes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/budget/validators/envelope').envelopeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/budget/validators/envelope').envelopeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'envelopes.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/enveloppes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['show']>>>
    }
  }
  'envelopes.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/enveloppes/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['edit']>>>
    }
  }
  'envelopes.update': {
    methods: ["PUT"]
    pattern: '/fiches/enveloppes/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/budget/validators/envelope').envelopeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/budget/validators/envelope').envelopeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'envelopes.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/enveloppes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/envelopes_controller').default['destroy']>>>
    }
  }
  'recipes.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/recettes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['index']>>>
    }
  }
  'recipes.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/recettes/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['create']>>>
    }
  }
  'recipes.import': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/recettes/importer'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['importForm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['importForm']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['importForm']>>>
    }
  }
  'recipes.import.store': {
    methods: ["POST"]
    pattern: '/fiches/recettes/importer'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/menu/validators/pantry').recipeImportValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/menu/validators/pantry').recipeImportValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['import']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['import']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['import']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'recipes.plan': {
    methods: ["POST"]
    pattern: '/fiches/recettes/:id/planifier'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/menu/validators/pantry').planSuggestionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/menu/validators/pantry').planSuggestionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['plan']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['plan']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['plan']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'recipes.store': {
    methods: ["POST"]
    pattern: '/fiches/recettes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/menu/validators/recipe').recipeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/menu/validators/recipe').recipeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'recipes.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/recettes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['show']>>>
    }
  }
  'recipes.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/recettes/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['edit']>>>
    }
  }
  'recipes.update': {
    methods: ["PUT"]
    pattern: '/fiches/recettes/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/menu/validators/recipe').recipeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/menu/validators/recipe').recipeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'recipes.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/recettes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/recipes_controller').default['destroy']>>>
    }
  }
  'ingredients.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/ingredients'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['index']>>>
    }
  }
  'ingredients.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/ingredients/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['edit']>>>
    }
  }
  'ingredients.update': {
    methods: ["PUT"]
    pattern: '/fiches/ingredients/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/menu/validators/ingredient').ingredientValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/menu/validators/ingredient').ingredientValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ingredients.substitutions.store': {
    methods: ["POST"]
    pattern: '/fiches/ingredients/:id/substituts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/menu/validators/pantry').substitutionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/menu/validators/pantry').substitutionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['storeSubstitution']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['storeSubstitution']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['storeSubstitution']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ingredients.substitutions.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/ingredients/substituts/:substitutionId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { substitutionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['destroySubstitution']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['destroySubstitution']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['destroySubstitution']>>>
    }
  }
  'ingredients.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/ingredients/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/ingredients_controller').default['destroy']>>>
    }
  }
  'vehicles.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/vehicules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['index']>>>
    }
  }
  'vehicles.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/vehicules/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['create']>>>
    }
  }
  'vehicles.store': {
    methods: ["POST"]
    pattern: '/fiches/vehicules'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/auto/validators/vehicle').vehicleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/auto/validators/vehicle').vehicleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'vehicles.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/vehicules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['show']>>>
    }
  }
  'vehicles.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/vehicules/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['edit']>>>
    }
  }
  'vehicles.update': {
    methods: ["PUT"]
    pattern: '/fiches/vehicules/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/auto/validators/vehicle').vehicleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/auto/validators/vehicle').vehicleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'vehicles.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/vehicules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['destroy']>>>
    }
  }
  'maintenances.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/vehicules/:id/entretiens/nouveau'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['create']>>>
    }
  }
  'maintenances.store': {
    methods: ["POST"]
    pattern: '/fiches/vehicules/:id/entretiens'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/auto/validators/maintenance').plannedMaintenanceValidator)>|InferInput<(typeof import('#domains/auto/validators/maintenance').doneMaintenanceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/auto/validators/maintenance').plannedMaintenanceValidator)>|InferInput<(typeof import('#domains/auto/validators/maintenance').doneMaintenanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maintenances.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/vehicules/entretiens/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['edit']>>>
    }
  }
  'maintenances.update': {
    methods: ["PUT"]
    pattern: '/fiches/vehicules/entretiens/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/auto/validators/maintenance').doneMaintenanceValidator)>|InferInput<(typeof import('#domains/auto/validators/maintenance').plannedMaintenanceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/auto/validators/maintenance').doneMaintenanceValidator)>|InferInput<(typeof import('#domains/auto/validators/maintenance').plannedMaintenanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maintenances.completion': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/vehicules/entretiens/:id/fait'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['completion']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['completion']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['completion']>>>
    }
  }
  'maintenances.complete': {
    methods: ["POST"]
    pattern: '/fiches/vehicules/entretiens/:id/fait'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/auto/validators/maintenance').completeMaintenanceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/auto/validators/maintenance').completeMaintenanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['complete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['complete']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['complete']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maintenances.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/vehicules/entretiens/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['destroy']>>>
    }
  }
  'subscriptions.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/abonnements'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['index']>>>
    }
  }
  'subscriptions.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/abonnements/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['create']>>>
    }
  }
  'subscriptions.store': {
    methods: ["POST"]
    pattern: '/fiches/abonnements'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/forms').subscriptionFormValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/forms').subscriptionFormValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'subscriptions.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/abonnements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['show']>>>
    }
  }
  'subscriptions.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/abonnements/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['edit']>>>
    }
  }
  'subscriptions.update': {
    methods: ["PUT"]
    pattern: '/fiches/abonnements/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/forms').subscriptionFormValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/forms').subscriptionFormValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'subscriptions.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/abonnements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['destroy']>>>
    }
  }
  'bills.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/factures'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['index']>>>
    }
  }
  'bills.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/factures/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['create']>>>
    }
  }
  'bills.store': {
    methods: ["POST"]
    pattern: '/fiches/factures'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/forms').billFormValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/forms').billFormValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bills.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/factures/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['show']>>>
    }
  }
  'bills.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/factures/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['edit']>>>
    }
  }
  'bills.update': {
    methods: ["PUT"]
    pattern: '/fiches/factures/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/forms').billFormValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/forms').billFormValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bills.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/factures/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['destroy']>>>
    }
  }
  'bills.pay': {
    methods: ["POST"]
    pattern: '/fiches/factures/:id/payer'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['pay']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['pay']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/bills_controller').default['pay']>>>
    }
  }
  'contracts.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/contrats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['index']>>>
    }
  }
  'contracts.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/contrats/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['create']>>>
    }
  }
  'contracts.store': {
    methods: ["POST"]
    pattern: '/fiches/contrats'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/household').contractValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/household').contractValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'contracts.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/contrats/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['show']>>>
    }
  }
  'contracts.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/contrats/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['edit']>>>
    }
  }
  'contracts.update': {
    methods: ["PUT"]
    pattern: '/fiches/contrats/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/household').contractValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/household').contractValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'contracts.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/contrats/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/contracts_controller').default['destroy']>>>
    }
  }
  'homes.index': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['index']>>>
    }
  }
  'homes.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['create']>>>
    }
  }
  'homes.store': {
    methods: ["POST"]
    pattern: '/fiches/logement'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').homeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').homeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'homes.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['show']>>>
    }
  }
  'homes.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['edit']>>>
    }
  }
  'homes.update': {
    methods: ["PUT"]
    pattern: '/fiches/logement/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').homeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').homeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/homes_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'chores.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/menage'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/household').choreValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/household').choreValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chores_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chores_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/chores_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'chores.suggest': {
    methods: ["POST"]
    pattern: '/fiches/logement/menage/suggestions'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/household').choreSuggestionValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/household').choreSuggestionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chores_controller').default['suggest']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chores_controller').default['suggest']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/chores_controller').default['suggest']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'projects.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/travaux/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['create']>>>
    }
  }
  'projects.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/travaux'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/household').projectValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/household').projectValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'projects.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/travaux/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['show']>>>
    }
  }
  'projects.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/travaux/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['edit']>>>
    }
  }
  'projects.update': {
    methods: ["PUT"]
    pattern: '/fiches/logement/travaux/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/household').projectValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/household').projectValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'projects.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/logement/travaux/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['destroy']>>>
    }
  }
  'projects.items.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/travaux/:id/elements'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/household').projectItemValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/household').projectItemValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['storeItem']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['storeItem']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['storeItem']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'projects.items.toggle': {
    methods: ["PATCH"]
    pattern: '/fiches/logement/travaux/elements/:itemId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { itemId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['toggleItem']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['toggleItem']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['toggleItem']>>>
    }
  }
  'projects.items.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/logement/travaux/elements/:itemId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { itemId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['destroyItem']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['destroyItem']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['destroyItem']>>>
    }
  }
  'projects.expenses.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/travaux/:id/depenses'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/household').projectExpenseValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/household').projectExpenseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['storeExpense']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['storeExpense']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['storeExpense']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'projects.expenses.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/logement/travaux/:id/depenses/:transactionId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; transactionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['destroyExpense']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['destroyExpense']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/projects_controller').default['destroyExpense']>>>
    }
  }
  'claims.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/sinistres/nouveau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['create']>>>
    }
  }
  'claims.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/sinistres'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['store']>>>
    }
  }
  'claims.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/sinistres/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['show']>>>
    }
  }
  'claims.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/sinistres/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['edit']>>>
    }
  }
  'claims.update': {
    methods: ["PUT"]
    pattern: '/fiches/logement/sinistres/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['update']>>>
    }
  }
  'claims.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/logement/sinistres/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['destroy']>>>
    }
  }
  'equipment.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/:id/equipements/nouveau'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['create']>>>
    }
  }
  'equipment.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/:id/equipements'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').equipmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').equipmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'equipment.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/equipements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['show']>>>
    }
  }
  'equipment.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/equipements/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['edit']>>>
    }
  }
  'equipment.update': {
    methods: ["PUT"]
    pattern: '/fiches/logement/equipements/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').equipmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').equipmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'equipment.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/logement/equipements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_controller').default['destroy']>>>
    }
  }
  'equipment_maintenances.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/equipements/:id/entretiens/nouveau'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['create']>>>
    }
  }
  'equipment_maintenances.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/equipements/:id/entretiens'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').plannedEquipmentMaintenanceValidator)>|InferInput<(typeof import('#domains/maison/validators/home').doneEquipmentMaintenanceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').plannedEquipmentMaintenanceValidator)>|InferInput<(typeof import('#domains/maison/validators/home').doneEquipmentMaintenanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'equipment_maintenances.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/entretiens/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['edit']>>>
    }
  }
  'equipment_maintenances.update': {
    methods: ["PUT"]
    pattern: '/fiches/logement/entretiens/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').doneEquipmentMaintenanceValidator)>|InferInput<(typeof import('#domains/maison/validators/home').plannedEquipmentMaintenanceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').doneEquipmentMaintenanceValidator)>|InferInput<(typeof import('#domains/maison/validators/home').plannedEquipmentMaintenanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'equipment_maintenances.completion': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/entretiens/:id/fait'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['completion']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['completion']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['completion']>>>
    }
  }
  'equipment_maintenances.complete': {
    methods: ["POST"]
    pattern: '/fiches/logement/entretiens/:id/fait'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').completeEquipmentMaintenanceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').completeEquipmentMaintenanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['complete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['complete']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['complete']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'equipment_maintenances.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/logement/entretiens/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/equipment_maintenances_controller').default['destroy']>>>
    }
  }
  'circuits.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/:id/circuits/nouveau'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['create']>>>
    }
  }
  'circuits.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/:id/circuits'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').circuitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').circuitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'circuits.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/circuits/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['edit']>>>
    }
  }
  'circuits.update': {
    methods: ["PUT"]
    pattern: '/fiches/logement/circuits/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').circuitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').circuitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'circuits.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/logement/circuits/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/circuits_controller').default['destroy']>>>
    }
  }
  'meters.create': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/:id/compteurs/nouveau'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['create']>>>
    }
  }
  'meters.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/:id/compteurs'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').meterValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').meterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'meters.show': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/compteurs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['show']>>>
    }
  }
  'meters.edit': {
    methods: ["GET","HEAD"]
    pattern: '/fiches/logement/compteurs/:id/modifier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['edit']>>>
    }
  }
  'meters.update': {
    methods: ["PUT"]
    pattern: '/fiches/logement/compteurs/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').meterValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').meterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'meters.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/logement/compteurs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['destroy']>>>
    }
  }
  'meters.readings.store': {
    methods: ["POST"]
    pattern: '/fiches/logement/compteurs/:id/releves'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/maison/validators/home').readingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#domains/maison/validators/home').readingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['storeReading']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['storeReading']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['storeReading']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'meters.readings.destroy': {
    methods: ["DELETE"]
    pattern: '/fiches/logement/releves/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['destroyReading']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['destroyReading']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/meters_controller').default['destroyReading']>>>
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/profil'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.update': {
    methods: ["PUT"]
    pattern: '/profil'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').profileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').profileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.password': {
    methods: ["PUT"]
    pattern: '/profil/mot-de-passe'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').passwordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').passwordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['updatePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['updatePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['updatePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'notifications.subscribe': {
    methods: ["POST"]
    pattern: '/profil/notifications/appareils'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/notifications/validators/push').subscribeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/notifications/validators/push').subscribeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['subscribe']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['subscribe']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['subscribe']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'notifications.unsubscribe': {
    methods: ["POST"]
    pattern: '/profil/notifications/appareils/retirer'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/notifications/validators/push').unsubscribeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/notifications/validators/push').unsubscribeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['unsubscribe']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['unsubscribe']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['unsubscribe']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'notifications.devices.destroy': {
    methods: ["DELETE"]
    pattern: '/profil/notifications/appareils/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['destroyDevice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['destroyDevice']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['destroyDevice']>>>
    }
  }
  'notifications.test': {
    methods: ["POST"]
    pattern: '/profil/notifications/test'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['test']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['test']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['test']>>>
    }
  }
  'notifications.reminders': {
    methods: ["PUT"]
    pattern: '/profil/notifications/rappels'
    types: {
      body: ExtractBody<InferInput<(typeof import('#domains/routine/validators/reminders').remindersValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#domains/routine/validators/reminders').remindersValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['updateReminders']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['updateReminders']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['updateReminders']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'changelog': {
    methods: ["GET","HEAD"]
    pattern: '/nouveautes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/changelog_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/changelog_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/changelog_controller').default['index']>>>
    }
  }
  'design': {
    methods: ["GET","HEAD"]
    pattern: '/design'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
      rawResponse: ExtractRawResponse<unknown>
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
}

export namespace Route {
  export type Request<Name extends keyof typeof routes> = RouteWithRegistry.Request<typeof routes, Name>
  export type Response<Name extends keyof typeof routes> = RouteWithRegistry.Response<typeof routes, Name>
  export type Params<Name extends keyof typeof routes> = RouteWithRegistry.Params<typeof routes, Name>
  export type Body<Name extends keyof typeof routes> = RouteWithRegistry.Body<typeof routes, Name>
  export type Query<Name extends keyof typeof routes> = RouteWithRegistry.Query<typeof routes, Name>
  export type Error<Name extends keyof typeof routes> = RouteWithRegistry.Error<typeof routes, Name>
}

export namespace Path {
  export type Request<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Request<typeof routes, M, P>
  export type Response<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Response<typeof routes, M, P>
  export type Params<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Params<typeof routes, M, P>
  export type Body<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Body<typeof routes, M, P>
  export type Query<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Query<typeof routes, M, P>
  export type Error<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Error<typeof routes, M, P>
}
