import StatusTag from '~/components/ui/status_tag'
import { formatDate } from '~/lib/format'
import type { ContractRow } from '#shared/types/maison'

/**
 * « Préavis avant le 01/02/2027 », tinted by urgency; « Résilié » once
 * ended; « Sans engagement » without a deadline.
 */
export default function ContractStatus({
  contract,
}: {
  contract: Pick<ContractRow, 'status' | 'noticeBy' | 'ended'>
}) {
  if (contract.ended) return <StatusTag status="done" label="Résilié" />
  if (!contract.noticeBy) return <span className="text-muted">Sans engagement</span>
  const label =
    contract.status === 'overdue'
      ? `Préavis dépassé (${formatDate(contract.noticeBy)})`
      : `Préavis avant le ${formatDate(contract.noticeBy)}`
  return <StatusTag status={contract.status} label={label} />
}
