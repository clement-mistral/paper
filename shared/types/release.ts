/**
 * Version of the running app and its changelog (CHANGELOG.md).
 */

export type ChangelogSection = {
  /** « Ajouté », « Modifié », « Corrigé »… */
  title: string
  items: string[]
}

export type ChangelogRelease = {
  /** `1.2.0`, or null for « Non publié ». */
  version: string | null
  /** ISO `YYYY-MM-DD`, null when unreleased. */
  date: string | null
  sections: ChangelogSection[]
}
