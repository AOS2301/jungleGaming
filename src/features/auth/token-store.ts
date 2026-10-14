/**
 * Credenciais da sessão no cliente.
 *
 * O token é opaco e emitido pela API; guardamos apenas o token e um resumo do usuário
 * (para degradar com elegância se a consulta de sessão falhar por rede). Senhas nunca
 * são armazenadas. O token do carrinho de visitante identifica o carrinho anônimo.
 */
import { readJson, removeKey, writeJson } from '@/lib/storage'
import type { User } from '@/api/contracts'

const SESSION_KEY = 'jg.session'
const GUEST_CART_KEY = 'jg.guestCart'

export interface StoredSession {
  token: string
  expiresAt: string
  user: User
}

let cached: StoredSession | null | undefined
const listeners = new Set<() => void>()

export function getStoredSession(): StoredSession | null {
  if (cached === undefined) cached = readJson<StoredSession>(SESSION_KEY)
  return cached
}
export const getToken = () => getStoredSession()?.token ?? null

export function setStoredSession(session: StoredSession): void {
  cached = session
  writeJson(SESSION_KEY, session)
  listeners.forEach((l) => l())
}
export function clearStoredSession(): void {
  cached = null
  removeKey(SESSION_KEY)
  listeners.forEach((l) => l())
}
export function onSessionStorageChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// sincroniza logout/login feitos em outras abas
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SESSION_KEY) {
      cached = undefined
      listeners.forEach((l) => l())
    }
  })
}

export const getGuestCartToken = (): string | null => readJson<string>(GUEST_CART_KEY)
export function ensureGuestCartToken(): string {
  let token = getGuestCartToken()
  if (!token) {
    token = crypto.randomUUID()
    writeJson(GUEST_CART_KEY, token)
  }
  return token
}
export const clearGuestCartToken = () => removeKey(GUEST_CART_KEY)
