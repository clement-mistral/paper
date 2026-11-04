import { readFile } from 'node:fs/promises'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { appVersion, parseChangelog } from '#support/release'

test.group('Release | changelog parser', () => {
  test('reads releases, sections and items', ({ assert }) => {
    const releases = parseChangelog(`# Changelog

Intro text, ignored.

## [Non publié]

### Ajouté

- Une idée
  sur deux lignes

## [1.1.0] - 2026-12-01

### Corrigé

- Un bug

## [1.0.0] - 2026-11-04

- Sans rubrique
`)

    assert.deepEqual(releases, [
      {
        version: null,
        date: null,
        sections: [{ title: 'Ajouté', items: ['Une idée sur deux lignes'] }],
      },
      { version: '1.1.0', date: '2026-12-01', sections: [{ title: 'Corrigé', items: ['Un bug'] }] },
      {
        version: '1.0.0',
        date: '2026-11-04',
        sections: [{ title: 'Notes', items: ['Sans rubrique'] }],
      },
    ])
  })

  test('drops an empty unreleased section and empty groups', ({ assert }) => {
    const releases = parseChangelog('## [Unreleased]\n\n### Ajouté\n\n## [0.1.0] - 2026-01-01\n')
    assert.deepEqual(releases, [{ version: '0.1.0', date: '2026-01-01', sections: [] }])
  })

  test('the version of package.json has an entry in CHANGELOG.md', async ({ assert }) => {
    const markdown = await readFile(app.makePath('CHANGELOG.md'), 'utf8')
    const versions = parseChangelog(markdown).map((release) => release.version)
    assert.include(versions, await appVersion())
  })
})
