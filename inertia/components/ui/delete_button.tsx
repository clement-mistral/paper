import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Trash2 } from 'lucide-react'
import Button from '~/components/ui/button'
import { ICON_STROKE } from '~/lib/icons'

/**
 * Two-step delete: the first click asks for confirmation in place.
 */
export default function DeleteButton({ href, label }: { href: string; label: string }) {
  const [confirming, setConfirming] = useState(false)
  const [processing, setProcessing] = useState(false)

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        <Trash2 size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
        Supprimer
      </Button>
    )
  }

  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="text-label text-muted">{label}</span>
      <Button
        variant="danger"
        disabled={processing}
        onClick={() =>
          router.delete(href, {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
          })
        }
      >
        Supprimer
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Annuler
      </Button>
    </div>
  )
}
