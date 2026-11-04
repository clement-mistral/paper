import { router } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import { Refrigerator, Trash2 } from 'lucide-react'
import { urlFor } from '~/client'
import Button from '~/components/ui/button'
import EmptyState from '~/components/ui/empty_state'
import Input from '~/components/ui/input'
import Section from '~/components/ui/section'
import Select from '~/components/ui/select'
import StatusTag from '~/components/ui/status_tag'
import { formatDate, formatDecimal } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { unitLabels } from '~/lib/labels'
import {
  PANTRY_LOCATIONS,
  PANTRY_LOCATION_LABELS,
  UNITS,
  type PantryLocation,
  type PantryRow,
} from '#shared/types/menu'

function Freshness({ row }: { row: PantryRow }) {
  if (!row.expiresOn) return null
  if (row.freshness === 'expired') {
    return <StatusTag status="overdue" label={`Périmé le ${formatDate(row.expiresOn)}`} />
  }
  if (row.freshness === 'soon') {
    return (
      <StatusTag status="upcoming" label={`À consommer avant le ${formatDate(row.expiresOn)}`} />
    )
  }
  return <span className="text-label text-muted">jusqu’au {formatDate(row.expiresOn)}</span>
}

/**
 * The quantity is edited in place; empty means « il y en a », 0 removes.
 */
function QuantityInput({ row }: { row: PantryRow }) {
  const initial = row.quantity === null ? '' : formatDecimal(row.quantity).replace(/\s/g, '')
  return (
    <form onSubmit={(event) => event.preventDefault()} className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor={`pantry-${row.id}`}>
        Quantité de {row.name}
      </label>
      <input
        id={`pantry-${row.id}`}
        defaultValue={initial}
        inputMode="decimal"
        placeholder="il y en a"
        onBlur={(event) => {
          const value = event.currentTarget.value.trim()
          if (value === initial) return
          router.patch(
            urlFor('pantry.update', { id: row.id }),
            { quantity: value === '' ? null : value },
            { preserveScroll: true }
          )
        }}
        className="h-8 w-20 rounded-control border border-border bg-bg px-2 text-right text-sm tabular-nums text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none"
      />
      <span className="w-14 text-label text-muted">
        {row.quantity !== null && row.unit && row.unit !== 'piece' ? unitLabels[row.unit] : ''}
      </span>
    </form>
  )
}

/**
 * « Placards » : the stock of the fridge, the cupboards and the freezer.
 * Cooked meals take from it, checked shopping items fill it.
 */
export default function PantrySection({ rows }: { rows: PantryRow[] }) {
  const byLocation = (location: PantryLocation) => rows.filter((row) => row.location === location)

  return (
    <Section title="Placards">
      <Form
        route="pantry.store"
        options={{ preserveScroll: true }}
        resetOnSuccess={['name', 'quantity', 'expiresOn']}
      >
        {({ errors, processing }) => (
          <div className="flex flex-wrap items-start gap-3">
            <Input
              label="Ajouter au stock"
              name="name"
              placeholder="Crème fraîche"
              error={errors.name}
              className="min-w-44 flex-1"
            />
            <Input
              label="Quantité"
              name="quantity"
              inputMode="decimal"
              placeholder="Optionnel"
              error={errors.quantity}
              className="w-28"
            />
            <Select label="Unité" name="unit" defaultValue="" className="w-28">
              <option value="">—</option>
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabels[unit]}
                </option>
              ))}
            </Select>
            <Select label="Où" name="location" defaultValue="fridge" className="w-36">
              {PANTRY_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {PANTRY_LOCATION_LABELS[location]}
                </option>
              ))}
            </Select>
            <Input
              label="À consommer avant"
              name="expiresOn"
              type="date"
              error={errors.expiresOn}
              className="w-44"
            />
            <Button type="submit" variant="secondary" disabled={processing} className="mt-[22px]">
              Ajouter
            </Button>
          </div>
        )}
      </Form>

      {rows.length === 0 ? (
        <EmptyState icon={<Refrigerator size={20} strokeWidth={ICON_STROKE} />} title="Stock vide">
          Ajoutez ce qu’il y a dans le frigo : les suggestions de repas en tiennent compte, et les
          courses cochées s’y ajoutent seules.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {PANTRY_LOCATIONS.map((location) => (
            <div key={location} className="flex flex-col gap-1">
              <h3 className="text-label text-muted">{PANTRY_LOCATION_LABELS[location]}</h3>
              {byLocation(location).length === 0 ? (
                <p className="py-2 text-label text-muted">Rien</p>
              ) : (
                <ul className="flex flex-col">
                  {byLocation(location).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-1.5"
                    >
                      <span className="min-w-0 flex-1 text-sm text-ink">{row.name}</span>
                      <QuantityInput row={row} />
                      <button
                        type="button"
                        aria-label={`Retirer ${row.name} du stock`}
                        title="Retirer"
                        onClick={() =>
                          router.delete(urlFor('pantry.destroy', { id: row.id }), {
                            preserveScroll: true,
                          })
                        }
                        className="grid size-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger"
                      >
                        <Trash2 size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                      </button>
                      {row.expiresOn && (
                        <span className="basis-full">
                          <Freshness row={row} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
