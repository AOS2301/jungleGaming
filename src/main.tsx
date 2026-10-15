import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createQueryClient } from '@/api/query-client'
import { initSessionManager } from '@/features/auth/session-manager'
import './index.css'
import { createAppRouter } from './router'

/** Liga a camada de mocks (MSW) se VITE_ENABLE_MOCKS=true; sem isso o código dos mocks nem entra no build. */
async function startMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { enableMocks } = await import('@/mocks')
  await enableMocks()
  if (import.meta.env.VITE_MOCK_CONTROLS === 'true') {
    const { mountMockPanel } = await import('@/mocks/panel')
    mountMockPanel()
  }
}

async function main() {
  await startMocks() // os mocks precisam estar prontos antes da primeira requisição

  const queryClient = createQueryClient()
  const router = createAppRouter(queryClient)
  initSessionManager(queryClient, router)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void main()
