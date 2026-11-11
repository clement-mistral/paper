import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'agenda': ExtractProps<(typeof import('../../inertia/pages/agenda.tsx'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'changelog': ExtractProps<(typeof import('../../inertia/pages/changelog.tsx'))['default']>
    'design': ExtractProps<(typeof import('../../inertia/pages/design.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'fiches/accounts/form': ExtractProps<(typeof import('../../inertia/pages/fiches/accounts/form.tsx'))['default']>
    'fiches/accounts/index': ExtractProps<(typeof import('../../inertia/pages/fiches/accounts/index.tsx'))['default']>
    'fiches/accounts/show': ExtractProps<(typeof import('../../inertia/pages/fiches/accounts/show.tsx'))['default']>
    'fiches/bills/form': ExtractProps<(typeof import('../../inertia/pages/fiches/bills/form.tsx'))['default']>
    'fiches/bills/index': ExtractProps<(typeof import('../../inertia/pages/fiches/bills/index.tsx'))['default']>
    'fiches/bills/show': ExtractProps<(typeof import('../../inertia/pages/fiches/bills/show.tsx'))['default']>
    'fiches/circuits/form': ExtractProps<(typeof import('../../inertia/pages/fiches/circuits/form.tsx'))['default']>
    'fiches/claims/form': ExtractProps<(typeof import('../../inertia/pages/fiches/claims/form.tsx'))['default']>
    'fiches/claims/show': ExtractProps<(typeof import('../../inertia/pages/fiches/claims/show.tsx'))['default']>
    'fiches/contracts/form': ExtractProps<(typeof import('../../inertia/pages/fiches/contracts/form.tsx'))['default']>
    'fiches/contracts/index': ExtractProps<(typeof import('../../inertia/pages/fiches/contracts/index.tsx'))['default']>
    'fiches/contracts/show': ExtractProps<(typeof import('../../inertia/pages/fiches/contracts/show.tsx'))['default']>
    'fiches/envelopes/form': ExtractProps<(typeof import('../../inertia/pages/fiches/envelopes/form.tsx'))['default']>
    'fiches/envelopes/index': ExtractProps<(typeof import('../../inertia/pages/fiches/envelopes/index.tsx'))['default']>
    'fiches/envelopes/show': ExtractProps<(typeof import('../../inertia/pages/fiches/envelopes/show.tsx'))['default']>
    'fiches/equipment_maintenances/complete': ExtractProps<(typeof import('../../inertia/pages/fiches/equipment_maintenances/complete.tsx'))['default']>
    'fiches/equipment_maintenances/form': ExtractProps<(typeof import('../../inertia/pages/fiches/equipment_maintenances/form.tsx'))['default']>
    'fiches/equipment/form': ExtractProps<(typeof import('../../inertia/pages/fiches/equipment/form.tsx'))['default']>
    'fiches/equipment/show': ExtractProps<(typeof import('../../inertia/pages/fiches/equipment/show.tsx'))['default']>
    'fiches/homes/form': ExtractProps<(typeof import('../../inertia/pages/fiches/homes/form.tsx'))['default']>
    'fiches/homes/show': ExtractProps<(typeof import('../../inertia/pages/fiches/homes/show.tsx'))['default']>
    'fiches/index': ExtractProps<(typeof import('../../inertia/pages/fiches/index.tsx'))['default']>
    'fiches/ingredients/form': ExtractProps<(typeof import('../../inertia/pages/fiches/ingredients/form.tsx'))['default']>
    'fiches/ingredients/index': ExtractProps<(typeof import('../../inertia/pages/fiches/ingredients/index.tsx'))['default']>
    'fiches/maintenances/complete': ExtractProps<(typeof import('../../inertia/pages/fiches/maintenances/complete.tsx'))['default']>
    'fiches/maintenances/form': ExtractProps<(typeof import('../../inertia/pages/fiches/maintenances/form.tsx'))['default']>
    'fiches/meters/form': ExtractProps<(typeof import('../../inertia/pages/fiches/meters/form.tsx'))['default']>
    'fiches/meters/show': ExtractProps<(typeof import('../../inertia/pages/fiches/meters/show.tsx'))['default']>
    'fiches/placements/holding': ExtractProps<(typeof import('../../inertia/pages/fiches/placements/holding.tsx'))['default']>
    'fiches/placements/index': ExtractProps<(typeof import('../../inertia/pages/fiches/placements/index.tsx'))['default']>
    'fiches/placements/show': ExtractProps<(typeof import('../../inertia/pages/fiches/placements/show.tsx'))['default']>
    'fiches/projects/form': ExtractProps<(typeof import('../../inertia/pages/fiches/projects/form.tsx'))['default']>
    'fiches/projects/show': ExtractProps<(typeof import('../../inertia/pages/fiches/projects/show.tsx'))['default']>
    'fiches/recipes/form': ExtractProps<(typeof import('../../inertia/pages/fiches/recipes/form.tsx'))['default']>
    'fiches/recipes/import': ExtractProps<(typeof import('../../inertia/pages/fiches/recipes/import.tsx'))['default']>
    'fiches/recipes/index': ExtractProps<(typeof import('../../inertia/pages/fiches/recipes/index.tsx'))['default']>
    'fiches/recipes/show': ExtractProps<(typeof import('../../inertia/pages/fiches/recipes/show.tsx'))['default']>
    'fiches/subscriptions/form': ExtractProps<(typeof import('../../inertia/pages/fiches/subscriptions/form.tsx'))['default']>
    'fiches/subscriptions/index': ExtractProps<(typeof import('../../inertia/pages/fiches/subscriptions/index.tsx'))['default']>
    'fiches/subscriptions/show': ExtractProps<(typeof import('../../inertia/pages/fiches/subscriptions/show.tsx'))['default']>
    'fiches/vehicles/form': ExtractProps<(typeof import('../../inertia/pages/fiches/vehicles/form.tsx'))['default']>
    'fiches/vehicles/index': ExtractProps<(typeof import('../../inertia/pages/fiches/vehicles/index.tsx'))['default']>
    'fiches/vehicles/show': ExtractProps<(typeof import('../../inertia/pages/fiches/vehicles/show.tsx'))['default']>
    'lists': ExtractProps<(typeof import('../../inertia/pages/lists.tsx'))['default']>
    'money': ExtractProps<(typeof import('../../inertia/pages/money.tsx'))['default']>
    'money/income': ExtractProps<(typeof import('../../inertia/pages/money/income.tsx'))['default']>
    'money/transfer': ExtractProps<(typeof import('../../inertia/pages/money/transfer.tsx'))['default']>
    'newspaper/choice': ExtractProps<(typeof import('../../inertia/pages/newspaper/choice.tsx'))['default']>
    'newspaper/show': ExtractProps<(typeof import('../../inertia/pages/newspaper/show.tsx'))['default']>
    'newspaper/sources': ExtractProps<(typeof import('../../inertia/pages/newspaper/sources.tsx'))['default']>
    'profile': ExtractProps<(typeof import('../../inertia/pages/profile.tsx'))['default']>
    'report': ExtractProps<(typeof import('../../inertia/pages/report.tsx'))['default']>
    'review': ExtractProps<(typeof import('../../inertia/pages/review.tsx'))['default']>
    'tasks/show': ExtractProps<(typeof import('../../inertia/pages/tasks/show.tsx'))['default']>
    'today': ExtractProps<(typeof import('../../inertia/pages/today.tsx'))['default']>
  }
}
