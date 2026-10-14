/**
 * Ponto de entrada da camada de mocks. É importado dinamicamente por `main.tsx` apenas
 * quando VITE_ENABLE_MOCKS=true, então não entra no bundle de uma build sem mocks.
 */
import { setupWorker } from 'msw/browser'
import { DB_KEY, invalidateMemory } from './db'
import { resetMocks } from './reset'
import { handlers } from './handlers'
import { bootstrapOrders } from './handlers/orders'
import { realtimeHandlers } from './realtime'
import { loadInitialScenario } from './scenarios'

export async function enableMocks(): Promise<void> {
  loadInitialScenario(import.meta.env.VITE_MOCK_SCENARIO)

  // ?reset=1 restaura a semente antes de subir o app (e remove o parâmetro da URL)
  const url = new URL(window.location.href)
  if (url.searchParams.has('reset')) {
    resetMocks({ reload: false })
    url.searchParams.delete('reset')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }

  const worker = setupWorker(...handlers, ...realtimeHandlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })

  bootstrapOrders()
  // mudanças feitas em outra aba chegam via localStorage
  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY) invalidateMemory()
  })
  if (import.meta.env.VITE_MOCK_CONTROLS === 'true') void import('./controls').then((m) => (window.__mocks = m.mockControls))
}
