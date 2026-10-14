import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { isApiError } from '@/api/errors'
import { qk } from '@/api/queries'
import type { User } from '@/api/contracts'
import { clearStoredSession, getStoredSession, setStoredSession } from './token-store'

/**
 * Sessão recuperável após refresh: com token guardado, consultamos GET /session.
 *  - 401  -> sessão inválida/expirada: limpa credenciais e segue como visitante;
 *  - falha transitória (rede/5xx) -> mantém o usuário guardado (modo degradado);
 *    as próximas chamadas autenticadas mostram o erro real.
 */
export const sessionQueryOptions = queryOptions({
  queryKey: qk.session,
  queryFn: async ({ signal }): Promise<User | null> => {
    const stored = getStoredSession()
    if (!stored) return null
    try {
      const session = await api.auth.session({ signal })
      if (session.user.id !== stored.user.id || session.expiresAt !== stored.expiresAt) {
        setStoredSession({ token: stored.token, expiresAt: session.expiresAt, user: session.user })
      }
      return session.user
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        clearStoredSession()
        return null
      }
      return stored.user
    }
  },
  staleTime: 5 * 60_000,
  retry: false,
})

export const ensureSession = (queryClient: QueryClient) => queryClient.ensureQueryData(sessionQueryOptions)

export function useSession() {
  const { data } = useQuery(sessionQueryOptions)
  const user = data ?? null
  return { user, isAuthenticated: user !== null, scope: user?.id ?? 'guest' }
}
