import { z } from 'zod'

export const ERROR_CODES = [
  'VALIDATION_FAILED', // 422
  'UNAUTHENTICATED', // 401 — sem credencial / inválida
  'SESSION_EXPIRED', // 401 — credencial válida que expirou
  'INVALID_CREDENTIALS', // 401 — login
  'FORBIDDEN', // 403
  'NOT_FOUND', // 404
  'EMAIL_TAKEN', // 409
  'USERNAME_TAKEN', // 409
  'WALLET_ADDRESS_IN_USE', // 409
  'WALLET_SLOT_TAKEN', // 409
  'WALLET_CONNECTION_REJECTED', // 403
  'WALLET_NOT_CONNECTED', // 409
  'COUPON_INVALID', // 422
  'COUPON_EXPIRED', // 422
  'COUPON_MIN_NOT_MET', // 422
  'AVAILABILITY_CONFLICT', // 409
  'QUOTE_CHANGED', // 409
  'IDEMPOTENCY_KEY_REQUIRED', // 400
  'IDEMPOTENCY_KEY_REUSED', // 409
  'SERVICE_UNAVAILABLE', // 503 (transitório)
  'INTERNAL_ERROR', // 500
  'RATE_LIMITED', // 429
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    /** Erros por campo (422): { email: "E-mail já cadastrado" } */
    fields: z.record(z.string()).optional(),
    /** Dados adicionais: nova cotação em QUOTE_CHANGED, linhas em AVAILABILITY_CONFLICT... */
    details: z.unknown().optional(),
    retryable: z.boolean().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
