import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode, startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import { createQueryClient } from '@/api/query-client'
import { initSessionManager } from '@/features/auth/session-manager'
import { createAppRouter } from './router'

/** Monta a aplicação (depois que a camada de mocks, se habilitada, já está ativa). */
export async function startApp(): Promise<void> {
  const queryClient = createQueryClient()
  const router = createAppRouter(queryClient)
  initSessionManager(queryClient, router)

  const root = createRoot(document.getElementById('root')!)
  // a criação do router/cliente e o primeiro render ficam em tarefas separadas
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  // render em "transition": o React fatia o trabalho em blocos de ~5 ms, sem tarefas longas na thread principal
  startTransition(() => {
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>,
    )
  })

  // painel de controle dos mocks: fora do caminho crítico (carrega quando o navegador está ocioso)
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true' && import.meta.env.VITE_MOCK_CONTROLS === 'true') {
    const mount = () => void import('@/mocks/panel').then((m) => m.mountMockPanel())
    if ('requestIdleCallback' in window) window.requestIdleCallback(mount, { timeout: 4000 })
    else setTimeout(mount, 1500)
  }
}
