/**
 * Infraestrutura comum dos handlers REST: latência, falhas injetadas, autenticação,
 * validação de corpo e formato padronizado de erros.
 */
import { delay, HttpResponse, type HttpResponseResolver } from 'msw'
import type { ZodTypeAny, z } from 'zod'
import type { ApiErrorBody, ErrorCode } from '@/api/contracts'
import { commit, getDb, type DbSession, type DbUser } from './db'
import { getScenario, type FaultEffect } from './scenarios'

export const SESSION_TTL_MS = 30 * 60 * 1000

// ---------- respostas ----------
export function json<T>(data: T, status = 200, headers?: Record<string, string>): Response {
  return HttpResponse.json(data as never, { status, headers })
}

export function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  extra: { fields?: Record<string, string>; details?: unknown; retryable?: boolean } = {},
): Response {
  const body: ApiErrorBody = { error: { code, message, ...extra } }
  const headers: Record<string, string> = {}
  if (status === 503 || status === 429) headers['Retry-After'] = '1'
  return HttpResponse.json(body as never, { status, headers })
}

export const notFound = (what = 'Recurso') => apiError(404, 'NOT_FOUND', `${what} não encontrado.`)

// ---------- validação ----------
export async function parseBody<S extends ZodTypeAny>(request: Request, schema: S): Promise<{ data: z.infer<S> } | { response: Response }> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { response: apiError(422, 'VALIDATION_FAILED', 'Corpo da requisição inválido.') }
  }
  const result = schema.safeParse(raw)
  if (result.success) return { data: result.data }
  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_'
    if (!(key in fields)) fields[key] = issue.message
  }
  return { response: apiError(422, 'VALIDATION_FAILED', 'Verifique os campos informados.', { fields }) }
}

// ---------- autenticação ----------
export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  const match = header?.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export type Authed = { user: DbUser; session: DbSession }

/** Retorna o usuário autenticado ou uma Response 401. */
export function authenticate(request: Request): Authed | Response {
  const token = bearerToken(request)
  if (!token) return apiError(401, 'UNAUTHENTICATED', 'Entre para continuar.')
  const d = getDb()
  const session = d.sessions.find((s) => s.token === token)
  if (!session) return apiError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  if (session.expiresAt <= Date.now()) return apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
  const user = d.users.find((u) => u.id === session.userId)
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  return { user, session }
}

/** Autenticação opcional: usuário se houver token válido; erro 401 se o token estiver expirado/ inválido. */
export function optionalAuth(request: Request): Authed | Response | null {
  if (!bearerToken(request)) return null
  return authenticate(request)
}

// ---------- latência e falhas ----------
let latencyCounter = 0
let listCounter = 0
const DESCENDING_MS = [1800, 900, 250]

function pseudoRandom(n: number): number {
  let x = (Math.imul(n + 1, 2654435761) ^ 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0
  x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

async function applyLatency(request: Request): Promise<void> {
  const { minMs, maxMs, strategy } = getScenario().latency
  const path = new URL(request.url).pathname
  let ms: number
  if (strategy === 'descending' && path === '/api/nfts') {
    ms = DESCENDING_MS[listCounter++ % DESCENDING_MS.length]!
  } else {
    ms = Math.round(minMs + pseudoRandom(latencyCounter++) * (maxMs - minMs))
  }
  if (ms > 0) await delay(ms)
}

async function effectToResponse(effect: FaultEffect, request: Request): Promise<Response> {
  switch (effect.kind) {
    case 'network-error':
      return HttpResponse.error()
    case 'stall':
      await delay('infinite')
      return HttpResponse.error()
    case 'expire-session': {
      const token = bearerToken(request)
      const d = getDb()
      const s = d.sessions.find((x) => x.token === token)
      if (s) {
        s.expiresAt = Date.now() - 1
        commit()
      }
      return apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
    }
    case 'http':
      return apiError(effect.status, effect.code, effect.message, { fields: effect.fields, retryable: effect.retryable })
  }
}

async function evaluateFaults(request: Request, phase: 'before' | 'after'): Promise<Response | null> {
  const faults = getScenario().faults
  if (faults.length === 0) return null
  const d = getDb()
  const pathname = new URL(request.url).pathname
  for (const fault of faults) {
    if ((fault.when ?? 'before') !== phase) continue
    if (fault.method && fault.method !== request.method) continue
    if (!new RegExp(fault.path).test(pathname)) continue
    if (fault.times !== undefined) {
      const count = d.faults[fault.id] ?? 0
      if (count >= fault.times) continue
      d.faults[fault.id] = count + 1
      commit()
    }
    return effectToResponse(fault.effect, request)
  }
  return null
}

/** Consome um disparo único (persistido) — usado por falhas "uma vez" no meio de um handler. */
export function consumeOnce(id: string): boolean {
  const d = getDb()
  if ((d.faults[id] ?? 0) >= 1) return false
  d.faults[id] = 1
  commit()
  return true
}

type Args = { request: Request; params: Record<string, string> }

/** Envolve um handler aplicando latência e falhas do cenário ativo. */
export function resolver(fn: (args: Args) => Promise<Response> | Response): HttpResponseResolver {
  return async ({ request, params }) => {
    getDb()
    await applyLatency(request)
    const before = await evaluateFaults(request, 'before')
    if (before) return before
    const response = await fn({ request, params: params as Record<string, string> })
    const after = await evaluateFaults(request, 'after')
    return after ?? response
  }
}

// ---------- hash de senha (PBKDF2 via WebCrypto) ----------
const encoder = new TextEncoder()
export async function hashPassword(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations }, key, 256)
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomToken(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

/** Hash não criptográfico (cyrb53) para fingerprints e comparação de payloads. */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}
