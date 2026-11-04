import { type ReactNode } from 'react'
import Logo from '~/components/logo'
import FlashToasts from '~/components/flash_toasts'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-sidebar px-4">
      <header className="py-3">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center pb-24">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <FlashToasts />
    </div>
  )
}
