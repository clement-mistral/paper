import { Link } from '@adonisjs/inertia/react'

/**
 * The Paper mark: a sheet with a folded corner, followed by the wordmark.
 */
export default function Logo() {
  return (
    <Link
      route="today"
      className="inline-flex h-10 items-center gap-2 rounded-control px-2.5 text-sm font-semibold text-ink"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 3h9.5L19 7.5V21H5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      Paper
    </Link>
  )
}
