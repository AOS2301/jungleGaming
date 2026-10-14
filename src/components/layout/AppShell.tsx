import { useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { Footer } from './Footer'
import { Header } from './Header'
import { LiveRegion } from './LiveRegion'

export function AppShell({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLElement>(null)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const firstRender = useRef(true)
  const router = useRouter()

  // Acessibilidade em SPA: ao mudar de rota, leva o foco ao conteúdo principal.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only-focusable fixed left-4 top-4 z-[100] rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
        onClick={(e) => {
          e.preventDefault()
          mainRef.current?.focus()
        }}
      >
        Ir para o conteúdo
      </a>
      <Header />
      <main id="conteudo" ref={mainRef} tabIndex={-1} className="flex-1 outline-none" data-router-ready={router.state.status === 'idle' ? 'true' : 'false'}>
        {children}
      </main>
      <Footer />
      <LiveRegion />
      <Toaster
        position="bottom-right"
        theme="dark"
        closeButton
        toastOptions={{ classNames: { toast: '!bg-surface !text-foreground !border !border-border !rounded-md', description: '!text-muted' } }}
      />
    </div>
  )
}
