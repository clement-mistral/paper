import { type ReactNode, useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import AccountBreadcrumb from '~/components/domain/account_breadcrumb'
import AmountCell from '~/components/domain/amount_cell'
import Button from '~/components/ui/button'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import StatusTag from '~/components/ui/status_tag'
import { cn } from '~/lib/cn'
import { formatDate } from '~/lib/format'
import type { BankImportDetail, BankImportLineRow, BankLineChoice } from '#shared/types/budget'
import type { InertiaProps } from '~/types'

type Envelope = { id: number; name: string }

/**
 * Review of a staged statement: the new lines (keep or not, on which
 * envelope), the ones already typed by hand, and those already imported.
 */
export default function ImportReview({
  bankImport,
  envelopes,
}: InertiaProps<{ bankImport: BankImportDetail; envelopes: Envelope[] }>) {
  const pending = bankImport.status === 'pending'
  const fresh = bankImport.lines.filter((line) => line.status === 'new')
  const matched = bankImport.lines.filter((line) => line.status === 'matched')
  const duplicates = bankImport.lines.filter((line) => line.status === 'duplicate')
  const done = bankImport.lines.filter(
    (line) => line.status === 'imported' || line.status === 'skipped'
  )

  const [choices, setChoices] = useState<Record<number, BankLineChoice>>(() =>
    Object.fromEntries(
      fresh.map((line) => [line.id, { id: line.id, include: true, envelopeId: line.envelopeId }])
    )
  )
  const [processing, setProcessing] = useState(false)
  const kept = Object.values(choices).filter((choice) => choice.include).length
  const update = (id: number, patch: Partial<BankLineChoice>) =>
    setChoices((current) => ({ ...current, [id]: { ...current[id], ...patch } }))

  const confirm = () =>
    router.post(
      urlFor('bank_imports.confirm', { id: bankImport.account.id, importId: bankImport.id }),
      { lines: Object.values(choices) },
      { onStart: () => setProcessing(true), onFinish: () => setProcessing(false) }
    )

  return (
    <Page
      title={pending ? 'Vérifier le relevé' : 'Relevé importé'}
      breadcrumb={<AccountBreadcrumb account={bankImport.account} />}
      description={`${bankImport.fileName}${
        bankImport.from && bankImport.to
          ? ` · du ${formatDate(bankImport.from)} au ${formatDate(bankImport.to)}`
          : ''
      }`}
      actions={
        <>
          <Button
            variant="secondary"
            onClick={() =>
              router.delete(
                urlFor('bank_imports.destroy', {
                  id: bankImport.account.id,
                  importId: bankImport.id,
                })
              )
            }
          >
            {pending ? 'Abandonner' : 'Annuler l’import'}
          </Button>
          {pending && (
            <Button disabled={processing} onClick={confirm}>
              {processing
                ? 'Import…'
                : `Importer ${kept} opération${kept > 1 ? 's' : ''}${
                    matched.length > 0 ? ` et rapprocher ${matched.length}` : ''
                  }`}
            </Button>
          )}
        </>
      }
    >
      {pending && (
        <Section title={`À importer · ${fresh.length}`} tone="accent">
          {fresh.length === 0 ? (
            <p className="text-sm text-muted">Rien de nouveau dans ce relevé.</p>
          ) : (
            <ul className="flex flex-col">
              {fresh.map((line) => (
                <NewLine
                  key={line.id}
                  line={line}
                  choice={choices[line.id]}
                  envelopes={envelopes}
                  onChange={(patch) => update(line.id, patch)}
                />
              ))}
            </ul>
          )}
        </Section>
      )}

      {matched.length > 0 && (
        <Section title={`Déjà saisies · ${matched.length}`} tone="budget">
          <p className="text-label text-muted">
            Ces opérations correspondent à ce que vous avez noté : elles ne seront pas ajoutées une
            seconde fois, seulement marquées comme confirmées par la banque.
          </p>
          <ul className="flex flex-col">
            {matched.map((line) => (
              <LineRow key={line.id} line={line}>
                {line.matched && (
                  <span className="text-label text-muted">
                    ↔ « {line.matched.label} » du {formatDate(line.matched.occurredOn)}
                  </span>
                )}
              </LineRow>
            ))}
          </ul>
        </Section>
      )}

      {!pending && done.length > 0 && (
        <Section title={`Importées · ${bankImport.counts.imported}`}>
          <ul className="flex flex-col">
            {done.map((line) => (
              <LineRow key={line.id} line={line}>
                {line.status === 'skipped' && <StatusTag status="planned" label="Ignorée" />}
              </LineRow>
            ))}
          </ul>
        </Section>
      )}

      {duplicates.length > 0 && (
        <Section title={`Déjà importées · ${duplicates.length}`}>
          <details>
            <summary className="cursor-pointer text-label text-muted hover:text-ink">
              Voir les lignes ignorées
            </summary>
            <ul className="mt-2 flex flex-col">
              {duplicates.map((line) => (
                <LineRow key={line.id} line={line} />
              ))}
            </ul>
          </details>
        </Section>
      )}

      <p className="text-label text-muted">
        <Link
          route="accounts.show"
          routeParams={{ id: bankImport.account.id }}
          className="hover:text-ink hover:underline"
        >
          Retour au compte
        </Link>
      </p>
    </Page>
  )
}

function LineRow({ line, children }: { line: BankImportLineRow; children?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border py-2">
      <span className="w-20 shrink-0 text-label text-muted tabular-nums">
        {formatDate(line.occurredOn)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink" title={line.label}>
        {line.label}
      </span>
      {children}
      <AmountCell cents={line.amountCents} />
    </li>
  )
}

function NewLine({
  line,
  choice,
  envelopes,
  onChange,
}: {
  line: BankImportLineRow
  choice: BankLineChoice
  envelopes: Envelope[]
  onChange: (patch: Partial<BankLineChoice>) => void
}) {
  const id = `line-${line.id}`
  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-2',
        !choice.include && 'opacity-50'
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={choice.include}
        onChange={(event) => onChange({ include: event.target.checked })}
        className="size-4 shrink-0 cursor-pointer accent-accent"
      />
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col">
        <span className="truncate text-sm text-ink">{line.displayLabel}</span>
        <span className="truncate text-label text-muted" title={line.label}>
          {formatDate(line.occurredOn)} · {line.label}
        </span>
      </label>
      {line.amountCents < 0 ? (
        <select
          aria-label={`Enveloppe de ${line.displayLabel}`}
          value={choice.envelopeId ?? ''}
          disabled={!choice.include}
          onChange={(event) =>
            onChange({ envelopeId: event.target.value ? Number(event.target.value) : null })
          }
          className="h-8 w-44 rounded-control border border-border bg-bg px-2 text-sm text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Sans enveloppe</option>
          {envelopes.map((envelope) => (
            <option key={envelope.id} value={envelope.id}>
              {envelope.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="w-44 text-label text-muted">Entrée d’argent</span>
      )}
      <AmountCell cents={line.amountCents} />
    </li>
  )
}

ImportReview.layout = [AppShell]
