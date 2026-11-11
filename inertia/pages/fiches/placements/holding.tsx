import { Form, Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import AmountCell from '~/components/domain/amount_cell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { Gain, Percent, PriceNote } from '~/components/domain/portfolio_parts'
import Button from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { formatQuantity, formatUnitPrice } from '~/lib/budget'
import { formatAmount, formatDate } from '~/lib/format'
import {
  ASSET_CLASSES,
  ASSET_CLASS_LABELS,
  OPERATION_LABELS,
  WRAPPER_LABELS,
  type HoldingDetail,
} from '#shared/types/budget'
import type { InertiaProps } from '~/types'

/** « 401,5 » for a form field. */
function toInput(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',')
}

export default function HoldingShow({ holding }: InertiaProps<{ holding: HoldingDetail }>) {
  return (
    <Page
      title={holding.name}
      breadcrumb={<FicheBreadcrumb type="placements" />}
      actions={
        <DeleteButton
          href={urlFor('portfolios.holdings.destroy', { id: holding.id })}
          label="Ses opérations et leurs mouvements d’argent seront supprimés."
        />
      }
    >
      <PropertyList
        properties={[
          {
            label: 'Compte',
            value: (
              <Link
                route="portfolios.show"
                routeParams={{ id: holding.account.id }}
                className="hover:underline"
              >
                {holding.account.name}
                {holding.account.wrapper && (
                  <span className="text-muted"> · {WRAPPER_LABELS[holding.account.wrapper]}</span>
                )}
              </Link>
            ),
          },
          { label: 'Symbole', value: holding.symbol ?? 'Non coté' },
          { label: 'Classe', value: ASSET_CLASS_LABELS[holding.assetClass] },
          { label: 'Quantité', value: formatQuantity(holding.quantity) },
          {
            label: 'Prix de revient moyen',
            value: holding.averageCost === null ? '—' : formatUnitPrice(holding.averageCost),
          },
          {
            label: 'Cours',
            value: (
              <span className="flex flex-col">
                <span>{holding.price === null ? '—' : formatUnitPrice(holding.price)}</span>
                <PriceNote holding={holding} />
              </span>
            ),
          },
          {
            label: 'Valeur',
            value: <span className="font-medium text-ink">{formatAmount(holding.valueCents)}</span>,
          },
          {
            label: 'Plus-value latente',
            value: (
              <span>
                <Gain cents={holding.latentCents} />{' '}
                <Percent value={holding.latentPercent} className="text-label" />
              </span>
            ),
          },
          { label: 'Depuis le 1er janvier', value: <Percent value={holding.ytdPercent} /> },
          { label: 'Plus-values réalisées', value: <Gain cents={holding.realizedCents} /> },
          { label: 'Dividendes reçus', value: formatAmount(holding.dividendsCents) },
        ]}
      />

      <Section title={`Opérations · ${holding.operations.length}`}>
        <DataTable
          caption="Opérations"
          rows={holding.operations}
          rowKey={(operation) => operation.id}
          columns={[
            { key: 'date', header: 'Date', cell: (operation) => formatDate(operation.occurredOn) },
            {
              key: 'kind',
              header: 'Opération',
              cell: (operation) => OPERATION_LABELS[operation.kind],
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
          ]}
        />
        <p className="text-label text-muted">
          Pour ajouter ou supprimer une opération, passez par{' '}
          <Link
            route="portfolios.show"
            routeParams={{ id: holding.account.id }}
            className="text-ink underline"
          >
            la fiche du compte
          </Link>
          .
        </p>
      </Section>

      <Section title="Réglages de la ligne">
        <Form
          route="portfolios.holdings.update"
          routeParams={{ id: holding.id }}
          options={{ preserveScroll: true }}
        >
          {({ errors, processing }) => (
            <div className="flex max-w-xl flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Nom" name="name" defaultValue={holding.name} error={errors.name} />
                <Select
                  label="Classe"
                  name="assetClass"
                  defaultValue={holding.assetClass}
                  error={errors.assetClass}
                >
                  {ASSET_CLASSES.map((option) => (
                    <option key={option} value={option}>
                      {ASSET_CLASS_LABELS[option]}
                    </option>
                  ))}
                </Select>
              </div>
              <Input
                label="Valeur d’une part saisie à la main (€)"
                name="manualPrice"
                inputMode="decimal"
                defaultValue={toInput(holding.manualPrice)}
                hint={
                  holding.symbol
                    ? 'Utilisée seulement si Yahoo Finance ne donne pas de cours.'
                    : 'Pour une ligne non cotée : la valeur de la part sur votre dernier relevé.'
                }
                error={errors.manualPrice}
              />
              <Textarea label="Notes" name="notes" defaultValue={holding.notes ?? ''} />
              <div>
                <Button type="submit" variant="secondary" disabled={processing}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </Form>
      </Section>
    </Page>
  )
}

HoldingShow.layout = [AppShell]
