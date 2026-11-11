import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { Pencil, Trash2 } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import AmountCell from '~/components/domain/amount_cell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { Gain, HoldingsTable } from '~/components/domain/portfolio_parts'
import Button, { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import Select from '~/components/ui/select'
import { formatQuantity, formatUnitPrice } from '~/lib/budget'
import { formatAmount, formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import {
  ASSET_CLASSES,
  ASSET_CLASS_LABELS,
  OPERATION_KINDS,
  OPERATION_LABELS,
  WRAPPER_LABELS,
  type OperationKind,
  type OperationRow,
  type PortfolioAccount,
} from '#shared/types/budget'
import type { InertiaProps } from '~/types'

const NEW_LINE = 'new'

/**
 * A purchase, a sale, a dividend or a fee. The fields follow the kind:
 * units and price for a trade, an amount otherwise; a new line asks for
 * its symbol (or its name when it is not quoted).
 */
function OperationForm({
  account,
  holdings,
  today,
}: {
  account: PortfolioAccount
  holdings: Array<{ id: number; name: string; symbol: string | null }>
  today: string
}) {
  const [kind, setKind] = useState<OperationKind>('buy')
  const [line, setLine] = useState<string>(holdings[0] ? String(holdings[0].id) : NEW_LINE)
  const trade = kind === 'buy' || kind === 'sell'
  const isNew = line === NEW_LINE

  return (
    <Form
      route="portfolios.operations.store"
      routeParams={{ id: account.id }}
      options={{ preserveScroll: true }}
      resetOnSuccess={['quantity', 'unitPrice', 'fees', 'amount', 'symbol', 'name']}
    >
      {({ errors, processing }) => (
        <div className="flex max-w-2xl flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="Opération"
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as OperationKind)}
              error={errors.kind}
            >
              {OPERATION_KINDS.map((option) => (
                <option key={option} value={option}>
                  {OPERATION_LABELS[option]}
                </option>
              ))}
            </Select>
            <Select
              label="Ligne"
              name={isNew ? undefined : 'holdingId'}
              value={line}
              onChange={(event) => setLine(event.target.value)}
              error={errors.holdingId}
            >
              {holdings.map((holding) => (
                <option key={holding.id} value={holding.id}>
                  {holding.name}
                  {holding.symbol ? ` (${holding.symbol})` : ''}
                </option>
              ))}
              <option value={NEW_LINE}>Nouvelle ligne…</option>
            </Select>
            <Input
              label="Date"
              name="occurredOn"
              type="date"
              defaultValue={today}
              max={today}
              error={errors.occurredOn}
            />
          </div>

          {isNew && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Symbole Yahoo Finance"
                name="symbol"
                placeholder="MC.PA"
                hint="Vide pour un fonds non coté (fonds euros…)."
                error={errors.symbol}
              />
              <Input label="Nom" name="name" placeholder="LVMH" error={errors.name} />
              <Select
                label="Classe"
                name="assetClass"
                defaultValue="stock"
                error={errors.assetClass}
              >
                {ASSET_CLASSES.map((option) => (
                  <option key={option} value={option}>
                    {ASSET_CLASS_LABELS[option]}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {trade ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Quantité"
                name="quantity"
                inputMode="decimal"
                placeholder="3"
                error={errors.quantity}
              />
              <Input
                label="Prix d’une unité (€)"
                name="unitPrice"
                inputMode="decimal"
                placeholder="401,50"
                error={errors.unitPrice}
              />
              <Input
                label="Frais"
                name="fees"
                inputMode="decimal"
                placeholder="0,00"
                error={errors.fees}
              />
            </div>
          ) : (
            <Input
              label={kind === 'dividend' ? 'Montant reçu' : 'Montant payé'}
              name="amount"
              inputMode="decimal"
              placeholder="0,00"
              error={errors.amount}
              className="sm:max-w-[calc(33%-0.5rem)]"
            />
          )}

          <div>
            <Button type="submit" disabled={processing}>
              Enregistrer l’opération
            </Button>
          </div>
        </div>
      )}
    </Form>
  )
}

function OperationsTable({ operations }: { operations: OperationRow[] }) {
  return (
    <DataTable
      caption="Opérations"
      rows={operations}
      rowKey={(operation) => operation.id}
      columns={[
        { key: 'date', header: 'Date', cell: (operation) => formatDate(operation.occurredOn) },
        {
          key: 'kind',
          header: 'Opération',
          cell: (operation) => (
            <span>
              {OPERATION_LABELS[operation.kind]}{' '}
              <Link
                route="portfolios.holdings.show"
                routeParams={{ id: operation.holdingId }}
                className="font-medium text-ink hover:underline"
              >
                {operation.holdingName}
              </Link>
            </span>
          ),
        },
        {
          key: 'detail',
          header: 'Détail',
          cell: (operation) =>
            operation.quantity !== null && operation.unitPrice !== null ? (
              <span className="text-muted tabular-nums">
                {formatQuantity(operation.quantity)} × {formatUnitPrice(operation.unitPrice)}
                {operation.feesCents > 0 && ` + ${formatAmount(operation.feesCents)} de frais`}
              </span>
            ) : (
              <span className="text-muted">—</span>
            ),
        },
        {
          key: 'amount',
          header: 'Montant',
          align: 'right',
          cell: (operation) => (
            <AmountCell
              cents={
                operation.kind === 'buy' || operation.kind === 'fee'
                  ? -operation.amountCents
                  : operation.amountCents
              }
              neutral={operation.kind === 'buy' || operation.kind === 'sell'}
              className="text-ink"
            />
          ),
        },
        {
          key: 'delete',
          header: '',
          align: 'right',
          cell: (operation) => (
            <button
              type="button"
              aria-label={`Supprimer l’opération du ${formatDate(operation.occurredOn)}`}
              title="Supprimer"
              onClick={() => {
                if (window.confirm('Supprimer cette opération et son mouvement d’argent ?')) {
                  router.delete(urlFor('portfolios.operations.destroy', { id: operation.id }), {
                    preserveScroll: true,
                  })
                }
              }}
              className="grid size-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger"
            >
              <Trash2 size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </button>
          ),
        },
      ]}
    />
  )
}

export default function PortfolioShow({
  account,
  operations,
  holdings,
  today,
}: InertiaProps<{
  account: PortfolioAccount
  operations: OperationRow[]
  holdings: Array<{ id: number; name: string; symbol: string | null }>
  today: string
}>) {
  return (
    <Page
      title={account.name}
      breadcrumb={<FicheBreadcrumb type="placements" />}
      actions={
        <Link
          route="accounts.edit"
          routeParams={{ id: account.id }}
          className={buttonClasses('secondary')}
        >
          <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Modifier le compte
        </Link>
      }
    >
      <PropertyList
        properties={[
          {
            label: 'Enveloppe',
            value: account.wrapper ? WRAPPER_LABELS[account.wrapper] : 'Placement',
          },
          { label: 'Banque', value: account.institution ?? '—' },
          {
            label: 'Ouvert le',
            value: account.openedOn ? formatDate(account.openedOn) : '—',
          },
          { label: 'Valeur des lignes', value: formatAmount(account.holdingsCents) },
          {
            label: 'Liquidités',
            value: (
              <Link
                route="accounts.show"
                routeParams={{ id: account.id }}
                className="hover:underline"
              >
                <span className="text-ink tabular-nums">{formatAmount(account.cashCents)}</span>
              </Link>
            ),
          },
          {
            label: 'Total',
            value: <span className="font-medium text-ink">{formatAmount(account.totalCents)}</span>,
          },
          { label: 'Plus-value latente', value: <Gain cents={account.latentCents} /> },
        ]}
      />

      <Section title="Lignes">
        {account.holdings.length > 0 ? (
          <HoldingsTable holdings={account.holdings} />
        ) : (
          <EmptyState title="Aucune ligne pour l’instant">
            Enregistrez un premier achat ci-dessous : la ligne est créée avec lui.
          </EmptyState>
        )}
      </Section>

      <Section title="Nouvelle opération">
        <OperationForm account={account} holdings={holdings} today={today} />
      </Section>

      {operations.length > 0 && (
        <Section title={`Opérations · ${operations.length}`}>
          <OperationsTable operations={operations} />
        </Section>
      )}
    </Page>
  )
}

PortfolioShow.layout = [AppShell]
