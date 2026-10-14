/**
 * Controles de teste/demonstração expostos em `window.__mocks` (quando VITE_MOCK_CONTROLS=true).
 *
 * São o "lado servidor" da simulação: mudam o banco simulado ou a camada Socket.IO do MSW.
 * Nada aqui toca o cache do React Query nem a UI — os eventos chegam via socket.io-client.
 */
import type { Nft } from '@/api/contracts'
import { commit, getDb, resetDb, updateNftEditions, type EditionPatch } from './db'
import { resolveOrder } from './handlers/orders'
import { realtimeControls } from './realtime'
import { PRESETS, getScenario, getScenarioSpec, setScenario, SCENARIO_STORAGE_KEY } from './scenarios'

const CLIENT_KEY_PREFIX = 'jg.'

export function clearClientStorage(keepScenario = true): void {
  try {
    const scenario = localStorage.getItem(SCENARIO_STORAGE_KEY)
    for (const key of Object.keys(localStorage)) if (key.startsWith(CLIENT_KEY_PREFIX)) localStorage.removeItem(key)
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(CLIENT_KEY_PREFIX)) sessionStorage.removeItem(key)
    if (keepScenario && scenario) localStorage.setItem(SCENARIO_STORAGE_KEY, scenario)
  } catch {
    /* ignore */
  }
}

/** Restaura o cenário conhecido: semente do banco + limpeza de sessão/carrinho/rascunhos do cliente. */
export function resetMocks(options: { reload?: boolean; keepScenario?: boolean } = {}): void {
  clearClientStorage(options.keepScenario ?? true)
  resetDb()
  if (options.reload !== false) window.location.assign(window.location.pathname)
}

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
