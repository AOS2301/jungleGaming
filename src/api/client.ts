import axios from 'axios'
import { getGuestCartToken, getToken } from '@/features/auth/token-store'
import { isAuthError, toApiError } from './errors'

const timeout = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 10_000)

/** Único cliente HTTP do app: toda chamada REST passa por aqui. */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  const guest = getGuestCartToken()
  if (guest) config.headers.set('X-Cart-Token', guest)
  return config
})

type UnauthorizedHandler = (hadToken: boolean) => void
let onUnauthorized: UnauthorizedHandler | null = null
/** Registrado pelo gerenciador de sessão para tratar 401 (expiração) de forma centralizada. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = toApiError(error)
    if (isAuthError(normalized) && getToken()) onUnauthorized?.(true)
    return Promise.reject(normalized)
  },
)
