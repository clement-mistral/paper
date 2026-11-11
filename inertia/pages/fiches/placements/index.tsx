import { type ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { AllocationBar, Gain, HoldingsTable, Percent } from '~/components/domain/portfolio_parts'
import { buttonClasses } from '~/components/ui/button'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import { ficheMeta } from '~/lib/fiches'
import { formatAmount, formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { WRAPPER_LABELS, type AccountWrapper, type PortfolioOverview } from '#shared/types/budget'
import type { InertiaProps } from '~/types'

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label text-muted">{label}</span>
      <span className="text-xl font-semibold text-ink">{children}</span>
    </div>
  )
}

/** « PEA », unless the account is already named so. */
function wrapperLabel(account: { name: string; wrapper: AccountWrapper | null }): string | null {
  const label = account.wrapper ? WRAPPER_LABELS[account.wrapper] : 'Placement'
  return label === account.name ? null : label
}

export default function PortfoliosIndex({
  portfolio,
}: InertiaProps<{ portfolio: PortfolioOverview }>) {
  const meta = ficheMeta.placements
  const empty = portfolio.accounts.length === 0 && portfolio.savings.length === 0
  return (
    <Page
      title={meta.label}
      breadcrumb={<FicheBreadcrumb type="placements" />}
      description={meta.description}
      actions={
        <Link route="accounts.create" className={buttonClasses('secondary')}>
          <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Nouveau compte
        </Link>
      }
    >
      {empty ? (
        <EmptyState
          icon={<DomainIcon icon={meta.icon} domain={meta.domain} size={22} />}
          title="Aucun placement pour l’instant"
        >
          Créez un compte de type « Placement » ou choisissez son enveloppe (PEA, assurance-vie,
          crypto…) : ses lignes apparaîtront ici, valorisées au cours du jour.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Figure label="Patrimoine placé">{formatAmount(portfolio.totalCents)}</Figure>
            <Figure label="Plus-values latentes">
              <Gain cents={portfolio.latentCents} />
              <Percent value={portfolio.latentPercent} className="ml-2 text-sm font-normal" />
            </Figure>
            <Figure label="Depuis le 1er janvier">
              <Percent value={portfolio.ytdPercent} />
            </Figure>
            <Figure label="Dernière séance">
              <Gain cents={portfolio.dayChangeCents} />
            </Figure>
          </div>

          <Section title="Répartition">
            <AllocationBar slices={portfolio.allocation} />
          </Section>

          {portfolio.accounts.map((account) => (
            <section key={account.id} className="flex flex-col gap-3">
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
                <div className="flex min-w-0 flex-col">
                  <h2 className="text-base font-semibold text-ink">
                    <Link
                      route="portfolios.show"
                      routeParams={{ id: account.id }}
                      className="hover:underline"
                    >
                      {account.name}
                    </Link>
                  </h2>
                  <p className="text-label text-muted">
                    {[
                      wrapperLabel(account),
                      account.institution,
                      account.openedOn ? `ouvert le ${formatDate(account.openedOn)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span className="flex items-baseline gap-3 text-sm">
                  <span className="text-muted">
                    dont liquidités {formatAmount(account.cashCents)}
                  </span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatAmount(account.totalCents)}
                  </span>
                </span>
              </header>
              {account.holdings.length > 0 ? (
                <HoldingsTable holdings={account.holdings} />
              ) : (
                <p className="text-sm text-muted">
                  Aucune ligne :{' '}
                  <Link
                    route="portfolios.show"
                    routeParams={{ id: account.id }}
                    className="text-ink underline"
                  >
                    enregistrez un premier achat
                  </Link>
                  .
                </p>
              )}
            </section>
          ))}

          {portfolio.savings.length > 0 && (
            <Section title="Épargne">
              <ul className="flex flex-col border-t border-border">
                {portfolio.savings.map((account) => (
                  <li
                    key={account.id}
                    className="flex items-center justify-between border-b border-border py-2 text-sm"
                  >
                    <Link
                      route="accounts.show"
                      routeParams={{ id: account.id }}
                      className="font-medium text-ink hover:underline"
                    >
                      {account.name}
                    </Link>
                    <span className="text-ink tabular-nums">
                      {formatAmount(account.balanceCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </Page>
  )
}

PortfoliosIndex.layout = [AppShell]
