import { type ReactNode, useCallback, useEffect, useState } from 'react'
import FlashToasts from '~/components/flash_toasts'
import CommandPalette from '~/components/ui/command_palette'
import NavRail, { MobileNavBar } from '~/components/ui/nav_rail'

/**
 * Persistent layout of every authenticated page: icon rail on the left
 * (bottom bar on small screens) and the universal capture palette.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const openPalette = useCallback(() => setPaletteOpen(true), [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex min-h-dvh">
      <NavRail onAdd={openPalette} />

      <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 print:pb-0">
        {children}
      </main>

      <MobileNavBar onAdd={openPalette} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <FlashToasts />
    </div>
  )
}
