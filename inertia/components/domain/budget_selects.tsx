import Select from '~/components/ui/select'
import type { BudgetOptions } from '#shared/types/maison'

/**
 * Envelope and account selects of the forms that spend money.
 */
export default function BudgetSelects({
  options,
  envelopeId,
  accountId,
  errors,
}: {
  options: BudgetOptions
  envelopeId?: number | null
  accountId?: number | null
  errors: Record<string, string | undefined>
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Select
        label="Enveloppe"
        name="envelopeId"
        defaultValue={envelopeId ?? ''}
        error={errors.envelopeId}
      >
        <option value="">Sans enveloppe</option>
        {options.envelopes.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        label="Compte"
        name="accountId"
        defaultValue={accountId ?? ''}
        error={errors.accountId}
      >
        <option value="">Aucun compte</option>
        {options.accounts.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </Select>
    </div>
  )
}
