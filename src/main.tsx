import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createQueryClient } from '@/api/query-client'
import { initSessionManager } from '@/features/auth/session-manager'
import './index.css'
import { createAppRouter } from './router'

async function bootstrap() {
  // A camada de mocks (MSW REST + Socket.IO) só é carregada quando habilitada por configuração.
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { enableMocks } = await import('@/mocks')
    await enableMocks()
  }

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

  if (import.meta.env.VITE_ENABLE_MOCKS === 'true' && import.meta.env.VITE_MOCK_CONTROLS === 'true') {
    const { mountMockPanel } = await import('@/mocks/panel')
    mountMockPanel()
  }
}

void bootstrap()
