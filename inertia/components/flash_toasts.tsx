import { useEffect } from 'react'
import { toast, Toaster } from 'sonner'
import { router, usePage } from '@inertiajs/react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { urlFor } from '~/client'

export default function FlashToasts() {
  const { flash } = usePage()

  useEffect(() => {
    return router.on('start', () => toast.dismiss('flash'))
  }, [])

  useEffect(() => {
    if (flash.error) toast.error(flash.error, { id: 'flash' })
    if (flash.success) toast.success(flash.success, { id: 'flash' })

    /**
     * After a capture, offer to undo it for a few seconds.
     */
    if (flash.capture) {
      const { id, message } = flash.capture
      toast.success(message, {
        id: `capture-${id}`,
        duration: 8000,
        action: {
          label: 'Annuler',
          onClick: () => router.post(urlFor('capture.undo', { id }), {}, { preserveScroll: true }),
        },
      })
    }
  }, [flash])

  return (
    <Toaster
      className="print:hidden"
      position="top-center"
      toastOptions={{ unstyled: true }}
      icons={{
        success: <CircleCheck size={18} strokeWidth={1.8} />,
        error: <CircleAlert size={18} strokeWidth={1.8} />,
      }}
    />
  )
}
