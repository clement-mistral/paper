import { usePage } from '@inertiajs/react'

/**
 * Who did what, shown only when the household has several people:
 * `by(id)` gives a first name (« Léa ») or null.
 */
export function useMembers() {
  const { props } = usePage()
  const members = props.members ?? []
  const shared = members.length > 1
  return {
    shared,
    by: (id: number | null): string | null =>
      shared && id !== null
        ? (members.find((member) => member.id === id)?.shortName ?? null)
        : null,
  }
}
