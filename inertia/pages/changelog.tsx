import AppShell from '~/layouts/app_shell'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import { formatDate } from '~/lib/format'
import type { InertiaProps } from '~/types'
import type { ChangelogRelease } from '#shared/types/release'

type Props = InertiaProps<{
  version: string
  commit: string | null
  releases: ChangelogRelease[]
}>

function releaseTitle(release: ChangelogRelease): string {
  return release.version ? `Version ${release.version}` : 'Prochainement'
}

export default function Changelog({ version, commit, releases }: Props) {
  return (
    <Page
      title="Nouveautés"
      description={
        <>
          Version installée : <span className="font-medium text-ink">{version}</span>
          {commit && <span className="tabular-nums"> ({commit})</span>}
        </>
      }
    >
      {releases.length === 0 && (
        <p className="text-sm text-muted">Aucune note de version pour le moment.</p>
      )}
      {releases.map((release) => (
        <Section key={release.version ?? 'unreleased'} title={releaseTitle(release)}>
          <div className="flex flex-col gap-5 pt-1">
            {(release.date || release.version === version) && (
              <p className="text-label text-muted">
                {release.date && <>Publiée le {formatDate(release.date)}</>}
                {release.date && release.version === version && ' · '}
                {release.version === version && 'version installée'}
              </p>
            )}
            {release.sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-ink">{section.title}</h3>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink marker:text-muted">
                  {section.items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </Page>
  )
}

Changelog.layout = [AppShell]
