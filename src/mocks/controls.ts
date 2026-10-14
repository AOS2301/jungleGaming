/**
 * Controles de teste/demonstração expostos em `window.__mocks` (quando VITE_MOCK_CONTROLS=true).
 *
 * São o "lado servidor" da simulação: mudam o banco simulado ou a camada Socket.IO do MSW.
 * Nada aqui toca o cache do React Query nem a UI — os eventos chegam via socket.io-client.
 */
import type { Nft } from '@/api/contracts'
import { commit, getDb, updateNftEditions, type EditionPatch } from './db'
import { resetMocks } from './reset'
import { resolveOrder } from './handlers/orders'
import { realtimeControls } from './realtime'
import { PRESETS, getScenario, getScenarioSpec, setScenario } from './scenarios'

export const mockControls = {
  scenario: {
    get: () => ({ spec: getScenarioSpec(), config: getScenario() }),
    set: (spec: string) => setScenario(spec),
    presets: () => Object.entries(PRESETS).map(([name, p]) => ({ name, description: p.description })),
  },
  reset: resetMocks,
  nft: {
    get: (id: string): Nft | undefined => getDb().nfts.find((n) => n.id === id),
    /** Altera preço/estoque, incrementa a versão e emite `nft.updated` via Socket.IO simulado. */
    update: (id: string, patches: Record<string, EditionPatch>) => updateNftEditions(id, patches),
  },
  realtime: realtimeControls,
  session: {
    /** Expira no servidor simulado as sessões de um usuário (ou de todos). */
    expire: (userId?: string) => {
      for (const s of getDb().sessions) if (!userId || s.userId === userId) s.expiresAt = Date.now() - 1
      commit()
    },
  },
  orders: {
    list: () => getDb().orders.map((o) => ({ id: o.id, userId: o.userId, status: o.status, version: o.version })),
    /** Resolve manualmente um pedido pendente (cenário `pending-hold`). */
    resolve: (id: string, outcome: 'confirmed' | 'declined' = 'confirmed') => resolveOrder(id, outcome)?.status ?? null,
  },
  db: { snapshot: () => structuredClone(getDb()) },
}

export type MockControls = typeof mockControls

declare global {
  interface Window {
    __mocks?: MockControls
  }
}
