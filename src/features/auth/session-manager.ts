/**
 * Ciclo de vida da sessão: login, cadastro, logout, expiração e troca de usuário.
 *
 * Regras de privacidade:
 *  - ao sair, expirar ou trocar de usuário, TODO cache privado (['u', ...]) é removido;
 *  - a subscription Socket.IO é recriada pelo RealtimeProvider quando o usuário muda;
 *  - rascunhos de checkout e chaves de idempotência são apagados no logout explícito
 *    e quando outro usuário entra (na expiração ficam guardados, por usuário, para retomada).
 */
import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { setUnauthorizedHandler } from '@/api/client'
import type { AuthResponse, User } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { isPrivateKey, qk } from '@/api/queries'
import { removeKeysWhere } from '@/lib/storage'
import { clearGuestCartToken, clearStoredSession, getGuestCartToken, getStoredSession, setStoredSession } from './token-store'

const PRIVATE_PREFIXES = ['/checkout', '/orders', '/profile', '/wallets']
const USER_DATA_PREFIXES = ['jg.checkout.', 'jg.idem.']

let queryClient: QueryClient
let router: AnyRouter
let expiryHandled = false

export function initSessionManager(qc: QueryClient, r: AnyRouter): void {
  queryClient = qc
  router = r
  setUnauthorizedHandler(handleSessionExpired)
}

export function purgePrivateData(): void {
  const predicate = { predicate: (q: { queryKey: readonly unknown[] }) => isPrivateKey(q.queryKey) }
  void queryClient.cancelQueries(predicate)
  queryClient.removeQueries(predicate)
}

function purgeUserDrafts(exceptUserId?: string): void {
  removeKeysWhere((key) => USER_DATA_PREFIXES.some((p) => key.startsWith(p) && !(exceptUserId && key.endsWith(`.${exceptUserId}`))))
}

function handleSessionExpired(): void {
  if (expiryHandled) return
  expiryHandled = true
  clearStoredSession()
  purgePrivateData()
  queryClient.setQueryData(qk.session, null)
  const { pathname, href } = router.state.location
  const isPrivateRoute = PRIVATE_PREFIXES.some((p) => pathname.startsWith(p))
  toast.error('Sua sessão expirou', { description: isPrivateRoute ? 'Entre novamente para continuar de onde parou.' : 'Entre novamente para acessar sua conta.' })
  if (isPrivateRoute) {
    void router.navigate({ to: '/login', search: { redirect: href, reason: 'expired' }, replace: true })
  }
}

/** Concluído um login/cadastro: grava credenciais, limpa dados de outro usuário e mescla o carrinho do visitante. */
export async function completeAuthentication(auth: AuthResponse): Promise<void> {
  const previous = getStoredSession()
  if (previous && previous.user.id !== auth.user.id) purgePrivateData()
  purgeUserDrafts(auth.user.id)
  expiryHandled = false
  setStoredSession({ token: auth.accessToken, expiresAt: auth.expiresAt, user: auth.user })
  queryClient.setQueryData(qk.session, auth.user)

  const guestToken = getGuestCartToken()
  if (guestToken) {
    try {
      await api.cart.merge(guestToken)
    } catch {
      toast.warning('Não foi possível mesclar o carrinho de visitante.', { description: 'Seus itens anteriores podem não aparecer.' })
    } finally {
      clearGuestCartToken()
      queryClient.removeQueries({ queryKey: qk.cart('guest') })
      queryClient.removeQueries({ queryKey: qk.quotes('guest') })
    }
  }
  await queryClient.invalidateQueries({ queryKey: qk.priv(auth.user.id) })
}

export async function performLogout(): Promise<void> {
  try {
    await api.auth.logout()
  } catch {
    /* a sessão local é encerrada mesmo que a API não responda */
  }
  clearStoredSession()
  clearGuestCartToken()
  purgePrivateData()
  purgeUserDrafts()
  queryClient.setQueryData(qk.session, null)
  expiryHandled = false
  await router.navigate({ to: '/', replace: true })
}

/** Aceita apenas caminhos internos (evita open redirect via ?redirect=). */
export function safeRedirect(value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : undefined
}

/** Reflete alterações de perfil/avatar na sessão (header, menu) sem nova consulta. */
export function syncSessionUser(patch: Partial<User>): void {
  const stored = getStoredSession()
  if (!stored) return
  const user = { ...stored.user, ...patch }
  setStoredSession({ ...stored, user })
  queryClient.setQueryData(qk.session, user)
}
