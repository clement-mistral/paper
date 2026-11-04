import { Car, Info } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import AmountCell from '~/components/domain/amount_cell'
import DomainIcon from '~/components/domain/domain_icon'
import DueProgress from '~/components/domain/due_progress'
import Button from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import Checkbox from '~/components/ui/checkbox'
import DataTable from '~/components/ui/data_table'
import DomainTag from '~/components/ui/domain_tag'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import ProgressBar from '~/components/ui/progress_bar'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import StatusTag from '~/components/ui/status_tag'
import { formatDate, formatKm, formatLiters, formatShortDay } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { DOMAINS, type Domain } from '#shared/types/domain'

/**
 * Living style guide of the design system. Sample values only.
 */
type SampleRow = { id: number; date: string; label: string; domain: Domain; cents: number }

const sampleRows: SampleRow[] = [
  { id: 1, date: '2026-10-28', label: 'Plein SP95', domain: 'auto', cents: -6700 },
  { id: 2, date: '2026-10-27', label: 'Facture électricité', domain: 'maison', cents: -8420 },
  { id: 3, date: '2026-10-26', label: 'Courses de la semaine', domain: 'menu', cents: -11235 },
  { id: 4, date: '2026-10-25', label: 'Salaire', domain: 'budget', cents: 245000 },
]

export default function Design() {
  return (
    <Page
      title="Design system"
      description="Composants de l’interface, avec des valeurs d’exemple."
    >
      <Section title="Boutons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Enregistrer</Button>
          <Button variant="secondary">Annuler</Button>
          <Button variant="ghost">Plus tard</Button>
          <Button size="sm">Petit</Button>
          <Button disabled>Désactivé</Button>
        </div>
      </Section>

      <Section title="Champs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Fournisseur" placeholder="EDF" />
          <Input label="Montant" placeholder="0,00 €" hint="En euros, TTC." />
          <Input
            label="Kilométrage"
            defaultValue="abc"
            error="Le kilométrage doit être un nombre."
          />
        </div>
        <div className="flex flex-col">
          <Checkbox label="Lait demi-écrémé" />
          <Checkbox label="Pâtes" defaultChecked />
        </div>
      </Section>

      <Section title="Domaines et statuts">
        <div className="flex flex-wrap items-center gap-2">
          {DOMAINS.map((domain) => (
            <DomainTag key={domain} domain={domain} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag status="done" />
          <StatusTag status="planned" />
          <StatusTag status="upcoming" />
          <StatusTag status="overdue" />
        </div>
      </Section>

      <Section title="Progression">
        <div className="flex flex-col gap-4">
          {DOMAINS.map((domain, index) => (
            <ProgressBar key={domain} value={0.2 + index * 0.2} tone={domain} label={domain} />
          ))}
          <DueProgress label="Vidange" detail="dans 1 200 km" ratio={0.9} domain="auto" />
          <DueProgress
            label="Contrôle technique"
            detail="dépassé de 3 jours"
            ratio={1}
            domain="auto"
          />
        </div>
      </Section>

      <Section title="Callout">
        <Callout icon={<Info size={16} strokeWidth={ICON_STROKE} />} title="Vidange à prévoir">
          Le compteur approche des 15 000 km depuis le dernier entretien.
        </Callout>
      </Section>

      <Section title="Propriétés de fiche">
        <div className="flex items-center gap-2">
          <DomainIcon icon={Car} domain="auto" size={20} />
          <span className="text-base font-semibold">Clio</span>
        </div>
        <PropertyList
          properties={[
            { label: 'Immatriculation', value: 'AB-123-CD' },
            { label: 'Carburant', value: 'SP95' },
            { label: 'Compteur', value: formatKm(142380) },
            {
              label: 'Dernier plein',
              value: `${formatLiters(38.2)} · ${formatDate('2026-10-28')}`,
            },
            { label: 'Domaine', value: <DomainTag domain="auto" /> },
          ]}
        />
      </Section>

      <Section title="Tableau">
        <DataTable
          caption="Transactions d’exemple"
          rows={sampleRows}
          rowKey={(row) => row.id}
          columns={[
            {
              key: 'date',
              header: 'Date',
              cell: (row) => <span className="text-muted">{formatShortDay(row.date)}</span>,
            },
            { key: 'label', header: 'Libellé', cell: (row) => row.label },
            { key: 'domain', header: 'Domaine', cell: (row) => <DomainTag domain={row.domain} /> },
            {
              key: 'amount',
              header: 'Montant',
              align: 'right',
              cell: (row) => <AmountCell cents={row.cents} />,
            },
          ]}
        />
      </Section>
    </Page>
  )
}

Design.layout = [AppShell]
