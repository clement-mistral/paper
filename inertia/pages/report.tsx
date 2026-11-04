import { type ReactNode } from 'react'
import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import ColumnChart from '~/components/charts/column_chart'
import Button, { buttonClasses } from '~/components/ui/button'
import ProgressBar from '~/components/ui/progress_bar'
import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import {
  formatAmount,
  formatAxisAmount,
  formatDate,
  formatDecimal,
  formatKm,
  formatLiters,
  formatMonthLong,
  formatMonthShort,
  formatPrice,
} from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { Domain } from '#shared/types/domain'
import type { MonthlyReport } from '#shared/types/report'
import type { InertiaProps } from '~/types'

/* ---------------------------------------------------------------------- */

function Block({
  title,
  domain,
  children,
  className,
}: {
  title: string
  domain?: Domain
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex break-inside-avoid flex-col gap-2', className)}>
      <h2 className="flex items-center gap-1.5 border-b border-border pb-1 text-[13px] font-semibold text-ink">
        {domain && (
          <span aria-hidden="true" className={cn('size-2 rounded-full', domainMeta[domain].bar)} />
        )}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Line({ label, value, muted }: { label: ReactNode; value: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={muted ? 'text-muted' : 'text-ink'}>{label}</span>
      <span className="shrink-0 text-ink tabular-nums">{value}</span>
    </div>
  )
}

function Nothing({ children = 'Rien ce mois-ci.' }: { children?: ReactNode }) {
  return <p className="text-muted">{children}</p>
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-[18px] font-semibold text-ink">{value}</dd>
      {note && <dd className="text-[11px] text-muted">{note}</dd>}
    </div>
  )
}

function percentChange(current: number, previous: number): string | undefined {
  if (previous <= 0) return undefined
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return 'stable par rapport au mois précédent'
  return `${change > 0 ? '+' : '−'}${Math.abs(change)} % par rapport au mois précédent`
}

/* ---------------------------------------------------------------------- */

export default function Report({ report }: InertiaProps<{ report: MonthlyReport }>) {
  const { money, maison, auto, menu, routine, upcoming } = report
  const monthLabel = formatMonthLong(report.month)
  const left = money.budgetedCents - money.spentCents
  const domainMax = Math.max(...money.byDomain.map((row) => row.cents), 1)

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 print:block print:p-0">
      <Head title={`Compte rendu · ${monthLabel}`} />

      <nav
        aria-label="Mois"
        className="flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-2 print:hidden"
      >
        <div className="flex items-center gap-1">
          <Link
            route="reports.show"
            routeParams={{ month: report.previousMonth }}
            className={buttonClasses('ghost', 'sm')}
          >
            <ChevronLeft size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {formatMonthLong(report.previousMonth)}
          </Link>
          <Link
            route="reports.show"
            routeParams={{ month: report.nextMonth }}
            className={buttonClasses('ghost', 'sm')}
          >
            {formatMonthLong(report.nextMonth)}
            <ChevronRight size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </Link>
        </div>
        <Button onClick={() => window.print()}>
          <Printer size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Imprimer ou enregistrer en PDF
        </Button>
      </nav>

      <article className="flex w-full max-w-[210mm] flex-col gap-5 border border-border bg-bg p-[12mm] text-[12px] leading-snug shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-end justify-between gap-4 border-b border-ink pb-3">
          <div>
            <p className="text-[11px] tracking-wide text-muted uppercase">Compte rendu du mois</p>
            <h1 className="text-[24px] font-bold text-ink">{monthLabel}</h1>
          </div>
          <p className="text-right text-[11px] text-muted">
            {report.householdName ? `Foyer de ${report.householdName}` : 'Paper'}
            <br />
            Édité le {formatDate(report.generatedOn)}
            {!report.complete && (
              <>
                <br />
                <span className="font-medium text-warning">
                  Mois en cours : chiffres provisoires
                </span>
              </>
            )}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
          <Figure
            label="Dépensé"
            value={formatAmount(money.spentCents)}
            note={percentChange(money.spentCents, money.previousSpentCents)}
          />
          <Figure
            label="Reste sur le budget"
            value={money.budgetedCents > 0 ? formatAmount(left) : '—'}
            note={money.budgetedCents > 0 ? `sur ${formatAmount(money.budgetedCents)}` : undefined}
          />
          <Figure label="Entrées" value={formatAmount(money.incomeCents)} />
          <Figure label="Patrimoine en fin de mois" value={formatAmount(money.netWorthCents)} />
        </dl>

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 print:grid-cols-2">
          {/* Argent ------------------------------------------------------ */}
          <Block title="Argent" domain="budget">
            <ColumnChart
              title="Dépenses des 6 derniers mois"
              domain="budget"
              height={130}
              table={false}
              data={money.trend.map(({ month, cents }) => ({
                key: month,
                label: formatMonthShort(month),
                detail: formatMonthLong(month),
                value: cents,
              }))}
              format={formatAmount}
              formatAxis={formatAxisAmount}
            />
            <p className="text-[11px] text-muted">Dépenses des 6 derniers mois</p>
            {money.byDomain.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {money.byDomain.map((row) => (
                  <li key={row.domain} className="flex flex-col gap-0.5">
                    <Line label={domainMeta[row.domain].label} value={formatAmount(row.cents)} />
                    <ProgressBar
                      value={row.cents / domainMax}
                      tone={row.domain}
                      label={`Dépenses ${domainMeta[row.domain].label}`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <Nothing>Aucune dépense.</Nothing>
            )}
          </Block>

          <Block title="Enveloppes" domain="budget">
            {money.byEnvelope.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {money.byEnvelope.map((envelope) => {
                  const ratio =
                    envelope.budgetCents > 0 ? envelope.spentCents / envelope.budgetCents : 0
                  return (
                    <li key={envelope.name} className="flex flex-col gap-0.5">
                      <Line
                        label={envelope.name}
                        value={
                          envelope.budgetCents > 0
                            ? `${formatAmount(envelope.spentCents)} / ${formatAmount(envelope.budgetCents)}`
                            : formatAmount(envelope.spentCents)
                        }
                      />
                      {envelope.budgetCents > 0 && (
                        <ProgressBar
                          value={ratio}
                          tone={ratio > 1 ? 'danger' : ratio > 0.9 ? 'warning' : 'budget'}
                          label={`Enveloppe ${envelope.name}`}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Nothing>Aucune enveloppe.</Nothing>
            )}
            {money.topExpenses.length > 0 && (
              <>
                <p className="mt-1 text-[11px] text-muted">Plus grosses dépenses</p>
                {money.topExpenses.map((expense, index) => (
                  <Line
                    key={`${expense.label}-${index}`}
                    label={
                      <>
                        {expense.label}
                        <span className="text-muted"> · {formatDate(expense.occurredOn)}</span>
                      </>
                    }
                    value={formatAmount(expense.cents)}
                  />
                ))}
              </>
            )}
          </Block>

          {/* Maison ------------------------------------------------------ */}
          <Block title="Maison" domain="maison">
            <Line
              label={`Factures payées (${maison.billsPaid.count})`}
              value={formatAmount(maison.billsPaid.cents)}
            />
            <Line label="Abonnements prélevés" value={formatAmount(maison.subscriptionsCents)} />
            {maison.meters.length > 0 && (
              <>
                <p className="mt-1 text-[11px] text-muted">Consommation</p>
                {maison.meters.map((meter) => (
                  <Line
                    key={meter.label}
                    label={meter.label}
                    value={
                      meter.consumption === null ? (
                        <span className="text-muted">relevés insuffisants</span>
                      ) : (
                        <>
                          {meter.estimated ? '≈ ' : ''}
                          {formatDecimal(meter.consumption)} {meter.unit}
                          {meter.previous !== null && (
                            <span className="text-muted">
                              {' '}
                              (avant : {formatDecimal(meter.previous)})
                            </span>
                          )}
                        </>
                      )
                    }
                  />
                ))}
              </>
            )}
            <p className="mt-1 text-[11px] text-muted">Ménage</p>
            <Line label="Tâches faites" value={maison.chores.done} />
            {maison.chores.overdue > 0 && (
              <Line label="En retard aujourd’hui" value={maison.chores.overdue} />
            )}
          </Block>

          <Block title="Entretiens, travaux, sinistres" domain="maison">
            {maison.maintenances.length === 0 &&
              maison.projects.length === 0 &&
              maison.claims.length === 0 && <Nothing />}
            {maison.maintenances.map((row, index) => (
              <Line
                key={`m-${index}`}
                label={
                  <>
                    {row.label} · {row.equipment}
                    <span className="text-muted"> · {formatDate(row.doneOn)}</span>
                  </>
                }
                value={row.cents ? formatAmount(row.cents) : '—'}
              />
            ))}
            {maison.projects.length > 0 && (
              <>
                <p className="mt-1 text-[11px] text-muted">Travaux</p>
                {maison.projects.map((project) => (
                  <Line
                    key={project.title}
                    label={
                      <>
                        {project.title}
                        <span className="text-muted"> · {project.status}</span>
                      </>
                    }
                    value={project.spentCents > 0 ? formatAmount(project.spentCents) : '—'}
                  />
                ))}
              </>
            )}
            {maison.claims.length > 0 && (
              <>
                <p className="mt-1 text-[11px] text-muted">Sinistres</p>
                {maison.claims.map((claim) => (
                  <Line
                    key={claim.title}
                    label={
                      <>
                        {claim.title}
                        <span className="text-muted"> · {formatDate(claim.occurredOn)}</span>
                      </>
                    }
                    value={claim.status}
                  />
                ))}
              </>
            )}
          </Block>

          {/* Auto -------------------------------------------------------- */}
          <Block title="Auto" domain="auto">
            {auto.length === 0 && <Nothing>Aucun véhicule.</Nothing>}
            {auto.map((vehicle) => (
              <div key={vehicle.name} className="flex flex-col gap-0.5">
                <p className="font-medium text-ink">{vehicle.name}</p>
                <Line
                  label="Kilomètres parcourus"
                  value={vehicle.distanceKm !== null ? formatKm(vehicle.distanceKm) : '—'}
                  muted
                />
                <Line
                  label={`Pleins (${vehicle.fillUps})`}
                  value={
                    vehicle.fillUps > 0
                      ? `${formatLiters(vehicle.liters)} · ${formatAmount(vehicle.fuelCents)}`
                      : '—'
                  }
                  muted
                />
                {vehicle.pricePerLiterCents !== null && (
                  <Line
                    label="Prix moyen"
                    value={`${formatPrice(vehicle.pricePerLiterCents / 100)} €/L`}
                    muted
                  />
                )}
                {vehicle.litersPer100Km !== null && (
                  <Line
                    label="Consommation"
                    value={`${formatDecimal(vehicle.litersPer100Km)} L/100 km`}
                    muted
                  />
                )}
                {vehicle.maintenances.map((row, index) => (
                  <Line
                    key={index}
                    label={`${row.title} · ${formatDate(row.doneOn)}`}
                    value={row.cents ? formatAmount(row.cents) : '—'}
                    muted
                  />
                ))}
              </div>
            ))}
          </Block>

          {/* Menu -------------------------------------------------------- */}
          <Block title="Menu" domain="menu">
            {menu.planned === 0 ? (
              <Nothing>Aucun repas planifié.</Nothing>
            ) : (
              <>
                <Line label="Repas planifiés" value={menu.planned} />
                <Line label="Cuisinés" value={menu.cooked} muted />
                <Line label="Autre chose" value={menu.other} muted />
                <Line label="Au restaurant" value={menu.eatenOut} muted />
                {menu.topRecipes.length > 0 && (
                  <>
                    <p className="mt-1 text-[11px] text-muted">Recettes du mois</p>
                    {menu.topRecipes.map((recipe) => (
                      <Line key={recipe.name} label={recipe.name} value={`${recipe.count} fois`} />
                    ))}
                  </>
                )}
              </>
            )}
          </Block>

          {/* Routine ----------------------------------------------------- */}
          <Block title="Routine">
            <Line
              label="Bilans validés"
              value={`${routine.reviewedDays} / ${routine.daysInMonth} jours`}
            />
            <ProgressBar
              value={routine.reviewedDays / routine.daysInMonth}
              tone="ink"
              label="Bilans validés"
            />
            <Line label="Meilleure série" value={`${routine.bestStreak} j`} muted />
            <Line
              label="Humeur moyenne"
              value={
                routine.averageMood !== null ? `${formatDecimal(routine.averageMood)} / 5` : '—'
              }
              muted
            />
            <Line label="Tâches terminées" value={routine.tasksDone} muted />
            {routine.habits.length > 0 && (
              <>
                <p className="mt-1 text-[11px] text-muted">Habitudes</p>
                {routine.habits.map((habit) => (
                  <Line
                    key={habit.name}
                    label={habit.name}
                    value={`${habit.days} / ${routine.daysInMonth} j`}
                  />
                ))}
              </>
            )}
          </Block>

          {/* À venir ----------------------------------------------------- */}
          <Block title={`À venir en ${formatMonthLong(report.nextMonth).toLowerCase()}`}>
            {upcoming.length === 0 ? (
              <Nothing>Aucune échéance.</Nothing>
            ) : (
              <ul className="flex flex-col gap-1">
                {upcoming.map((item, index) => (
                  <li key={index} className="flex items-baseline gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 shrink-0 translate-y-[-1px] rounded-full',
                        domainMeta[item.domain].bar
                      )}
                    />
                    <span className="w-12 shrink-0 text-muted tabular-nums">
                      {item.date ? formatDate(item.date).slice(0, 5) : '—'}
                    </span>
                    <span className="min-w-0 flex-1 text-ink">
                      {item.label}
                      {item.detail && <span className="text-muted"> · {item.detail}</span>}
                    </span>
                    <span className="sr-only">{domainMeta[item.domain].label}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      </article>
    </div>
  )
}

Report.layout = [AppShell]
