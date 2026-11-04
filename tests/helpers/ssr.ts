import app from '@adonisjs/core/services/app'
import type { PageObject } from '#tests/helpers/browser'

type SsrModule = { default: (page: PageObject) => Promise<{ head: string[]; body: string }> }

/**
 * Renders an Inertia page object through the SSR entry, with the Vite dev
 * server the test environment already runs (SSR is off in the app).
 */
export async function renderPage(page: PageObject): Promise<string> {
  const vite = await app.container.make('vite')
  const runner = await vite.createModuleRunner()
  try {
    const ssr = (await runner.import('/inertia/ssr.tsx')) as SsrModule
    const { body } = await ssr.default(page)
    return body
  } finally {
    await runner.close()
  }
}

/** Every `<svg>` of the page, in document order. */
export function svgs(html: string): string[] {
  return [...html.matchAll(/<svg[^>]*role="img"[\s\S]*?<\/svg>/g)].map(([svg]) => svg)
}
