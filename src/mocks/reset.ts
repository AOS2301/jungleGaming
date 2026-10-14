import { resetDb } from './db'
import { SCENARIO_STORAGE_KEY } from './scenarios'

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
