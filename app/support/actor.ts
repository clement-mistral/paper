import { HttpContext } from '@adonisjs/core/http'

/**
 * Who is acting: the signed-in person of the current request, read from
 * the request context (async local storage, `config/app.ts`). Null for
 * the scheduler, the listeners run after a request, and the tests that
 * call services directly: the row then stays unattributed.
 */
export function currentUserId(): number | null {
  const ctx = HttpContext.get()
  return ctx?.auth?.user?.id ?? null
}
