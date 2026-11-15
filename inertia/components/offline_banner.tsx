import { CloudOff } from 'lucide-react'
import { ICON_STROKE } from '~/lib/icons'
import { useOfflineQueue, useOnline, useQueueFlush } from '~/lib/offline'

/**
 * Shown while the device is offline: what is on screen is the last
 * version saved on this device, and what was done meanwhile waits.
 */
export default function OfflineBanner() {
  const online = useOnline()
  const queue = useOfflineQueue()
  useQueueFlush()

  if (online && queue.length === 0) return null
  const waiting =
    queue.length === 0
      ? ''
      : ` ${queue.length} modification${queue.length > 1 ? 's' : ''} en attente.`

  return (
    <div
      role="status"
      className="sticky top-0 z-20 flex items-center gap-2 border-b border-warning-bar/30 bg-warning-soft px-4 py-2 text-label text-warning print:hidden"
    >
      <CloudOff size={15} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0" />
      {online
        ? `Envoi des modifications faites hors ligne…${waiting}`
        : `Hors ligne : vous voyez la dernière version enregistrée sur cet appareil.${waiting}`}
    </div>
  )
}
