import axios, { AxiosError } from 'axios'
import { apiErrorBodySchema, type ErrorCode } from './contracts'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'canceled' | 'contract'

/** Erro normalizado para toda falha de transporte, HTTP ou de contrato. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CONTRACT_VIOLATION' | 'UNKNOWN'
  readonly fields: Record<string, string>
  readonly details: unknown
  readonly retryable: boolean

  constructor(init: {
    kind: ApiErrorKind
    message: string
    status?: number | null
    code?: ApiError['code']
    fields?: Record<string, string>
    details?: unknown
    retryable?: boolean
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status ?? null
    this.code = init.code ?? 'UNKNOWN'
    this.fields = init.fields ?? {}
    this.details = init.details
    this.retryable = init.retryable ?? false
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) return new ApiError({ kind: 'canceled', message: 'Requisição cancelada.' })
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ kind: 'timeout', code: 'TIMEOUT', message: 'O servidor demorou demais para responder.', retryable: true })
    }
    if (!error.response) {
      return new ApiError({ kind: 'network', code: 'NETWORK_ERROR', message: 'Não foi possível conectar ao servidor. Verifique sua conexão.', retryable: true })
    }
    const parsed = apiErrorBodySchema.safeParse(error.response.data)
    const status = error.response.status
    if (parsed.success) {
      const { code, message, fields, details, retryable } = parsed.data.error
      return new ApiError({
        kind: 'http',
        status,
        code: code as ApiError['code'],
        message,
        fields,
        details,
        retryable: retryable ?? (status >= 500 || status === 429),
      })
    }
    return new ApiError({ kind: 'http', status, message: `Erro inesperado (HTTP ${status}).`, retryable: status >= 500 })
  }
  return new ApiError({ kind: 'network', message: error instanceof Error ? error.message : 'Erro desconhecido.' })
}

/** Falhas transitórias: seguras para repetir automaticamente (leituras e operações idempotentes). */
export const isTransient = (e: unknown): boolean => {
  const err = toApiError(e)
  return err.kind === 'network' || err.kind === 'timeout' || (err.kind === 'http' && (err.status! >= 500 || err.status === 429))
}
/** Sem resposta do servidor: o resultado da operação é desconhecido. */
export const isOutcomeUnknown = (e: unknown): boolean => {
  const err = toApiError(e)
  return err.kind === 'network' || err.kind === 'timeout'
}
export const isAuthError = (e: unknown): boolean => {
  const err = toApiError(e)
  return err.status === 401 && (err.code === 'SESSION_EXPIRED' || err.code === 'UNAUTHENTICATED')
}
