import { Form, Link } from '@adonisjs/inertia/react'
import { router } from '@inertiajs/react'
import { FileUp } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import AccountBreadcrumb from '~/components/domain/account_breadcrumb'
import Button from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import StatusTag from '~/components/ui/status_tag'
import { formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { BankImportSummary } from '#shared/types/budget'
import type { InertiaProps } from '~/types'

/**
 * Upload of a statement (CSV or OFX) and the previous imports.
 */
export default function ImportStatement({
  account,
  history,
}: InertiaProps<{ account: { id: number; name: string }; history: BankImportSummary[] }>) {
  return (
    <Page
      title="Importer un relevé"
      breadcrumb={<AccountBreadcrumb account={account} />}
      description={`Les opérations de votre banque sur « ${account.name} ».`}
    >
      <Section title="Relevé">
        <div className="flex max-w-xl flex-col gap-4 pt-2">
          <Callout title="Rien n’est enregistré avant votre validation">
            Téléchargez le relevé depuis votre banque, au format CSV ou OFX (souvent appelé « Money
            », « Quicken » ou « Excel/CSV »). Paper reconnaît ce que vous avez déjà saisi et propose
            une enveloppe pour le reste.
          </Callout>
          <Form
            route="bank_imports.store"
            routeParams={{ id: account.id }}
            className="flex flex-wrap items-center gap-3"
          >
            {({ processing }) => (
              <>
                <label className="sr-only" htmlFor="statement">
                  Fichier du relevé
                </label>
                <input
                  id="statement"
                  name="statement"
                  type="file"
                  required
                  accept=".csv,.ofx,.qfx,.txt,text/csv"
                  className="min-w-0 flex-1 text-sm text-ink file:mr-3 file:h-9 file:cursor-pointer file:rounded-control file:border file:border-border file:bg-bg file:px-3 file:text-sm file:text-ink hover:file:bg-hover"
                />
                <Button type="submit" disabled={processing}>
                  <FileUp size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  {processing ? 'Lecture…' : 'Lire le relevé'}
                </Button>
              </>
            )}
          </Form>
        </div>
      </Section>

      {history.length > 0 && (
        <Section title="Imports précédents">
          <ul className="divide-y divide-border">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <Link
                  route="bank_imports.show"
                  routeParams={{ id: account.id, importId: item.id }}
                  className="min-w-0 flex-1 truncate text-sm text-ink hover:underline"
                >
                  {item.fileName}
                </Link>
                <span className="text-label text-muted">
                  {item.from && item.to
                    ? `du ${formatDate(item.from)} au ${formatDate(item.to)}`
                    : ''}
                  {item.status === 'done' &&
                    ` · ${item.counts.imported} importée(s), ${item.counts.matched} rapprochée(s)`}
                </span>
                {item.status === 'pending' ? (
                  <StatusTag status="upcoming" label="À valider" />
                ) : (
                  <StatusTag status="done" label="Importé" />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const undo = item.status === 'done'
                    if (
                      !undo ||
                      window.confirm(
                        'Annuler cet import ? Les opérations qu’il a créées seront supprimées.'
                      )
                    ) {
                      router.delete(
                        urlFor('bank_imports.destroy', { id: account.id, importId: item.id }),
                        { preserveScroll: true }
                      )
                    }
                  }}
                >
                  {item.status === 'done' ? 'Annuler l’import' : 'Abandonner'}
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Page>
  )
}

ImportStatement.layout = [AppShell]
