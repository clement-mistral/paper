import { configApp } from '@adonisjs/eslint-config'
import { react } from '@adonisjs/eslint-config/react'

export default configApp(...react, {
  /**
   * `shared/` holds plain types and constants used by both the server and
   * the client (no server runtime code).
   */
  files: ['inertia/**/*.{ts,tsx}'],
  rules: {
    '@adonisjs/no-backend-import-in-frontend': ['error', { allowed: ['#shared/**'] }],
  },
})
