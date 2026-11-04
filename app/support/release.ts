import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import type { ChangelogRelease, ChangelogSection } from '#shared/types/release'

/**
 * Version of the running app (package.json) and its changelog
 * (CHANGELOG.md, Keep a Changelog format). Both files are copied into the
 * production build; they are read once, except in development.
 */

const RELEASE_HEADING = /^##\s+\[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?\s*$/
const SECTION_HEADING = /^###\s+(.+?)\s*$/
const ITEM = /^[-*]\s+(.+?)\s*$/
const UNRELEASED = /^(non publié|unreleased)$/i

/**
 * Parses the subset of Markdown used by CHANGELOG.md: `## [x.y.z] - date`
 * releases, `### Section` groups and `- item` lines (an indented line
 * continues the previous item). Everything else is ignored.
 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = []
  let section: ChangelogSection | null = null

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim()
    const release = RELEASE_HEADING.exec(line)
    if (release) {
      const [, label, date] = release
      releases.push({
        version: UNRELEASED.test(label.trim()) ? null : label.trim(),
        date: date ?? null,
        sections: [],
      })
      section = null
      continue
    }

    const current = releases.at(-1)
    if (!current) continue

    const heading = SECTION_HEADING.exec(line)
    if (heading) {
      section = { title: heading[1], items: [] }
      current.sections.push(section)
      continue
    }

    const item = ITEM.exec(line)
    if (item) {
      if (!section) {
        section = { title: 'Notes', items: [] }
        current.sections.push(section)
      }
      section.items.push(item[1])
    } else if (line && raw.startsWith(' ') && section?.items.length) {
      section.items[section.items.length - 1] += ` ${line}`
    }
  }

  return releases
    .map((entry) => ({ ...entry, sections: entry.sections.filter((s) => s.items.length > 0) }))
    .filter((entry) => entry.version !== null || entry.sections.length > 0)
}

let cachedVersion: string | undefined
let cachedChangelog: ChangelogRelease[] | undefined

/**
 * `1.2.0`, from package.json.
 */
export async function appVersion(): Promise<string> {
  if (cachedVersion && !app.inDev) return cachedVersion
  try {
    const pkg = JSON.parse(await readFile(app.makePath('package.json'), 'utf8')) as {
      version?: unknown
    }
    cachedVersion = typeof pkg.version === 'string' ? pkg.version : '0.0.0'
  } catch {
    cachedVersion = '0.0.0'
  }
  return cachedVersion
}

/**
 * Short commit the image was built from (set by the CI), if any.
 */
export function appCommit(): string | null {
  return env.get('APP_COMMIT')?.slice(0, 7) || null
}

export async function changelog(): Promise<ChangelogRelease[]> {
  if (cachedChangelog && !app.inDev) return cachedChangelog
  try {
    cachedChangelog = parseChangelog(await readFile(app.makePath('CHANGELOG.md'), 'utf8'))
  } catch {
    cachedChangelog = []
  }
  return cachedChangelog
}
