import { http } from 'msw'
import { loginRequestSchema, signupRequestSchema, type AuthResponse, type SessionResponse } from '@/api/contracts'
import { PBKDF2_ITERATIONS } from '../fixtures'
import { commit, getDb, nextId, type DbSession } from '../db'
import { apiError, authenticate, bearerToken, hashPassword, json, parseBody, randomToken, resolver, SESSION_TTL_MS } from '../http'

function openSession(userId: string): DbSession {
  const d = getDb()
  const now = Date.now()
  d.sessions = d.sessions.filter((s) => s.expiresAt > now - 24 * 3600_000)
  const session: DbSession = { token: randomToken('tok'), userId, createdAt: now, expiresAt: now + SESSION_TTL_MS }
  d.sessions.push(session)
  commit()
  return session
}

const toAuthResponse = (session: DbSession, user: { id: string; displayName: string; email: string; avatarUrl: string | null }): AuthResponse => ({
  accessToken: session.token,
  expiresAt: new Date(session.expiresAt).toISOString(),
  user: { id: user.id, displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl },
})

export const authHandlers = [
  http.post(
    '*/api/auth/signup',
    resolver(async ({ request }) => {
      const parsed = await parseBody(request, signupRequestSchema)
      if ('response' in parsed) return parsed.response
      const { displayName, email, password } = parsed.data
      const d = getDb()
      if (d.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { fields: { email: 'Este e-mail já está cadastrado' } })
      }
      const id = nextId('usr')
      const salt = randomToken('salt')
      const base = email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9._]/g, '') || 'colecionador'
      let username = base.slice(0, 20)
      while (d.users.some((u) => u.username === username)) username = `${base.slice(0, 16)}${Math.floor(Math.random() * 9000 + 1000)}`
      const user = {
        id,
        email,
        displayName,
        username,
        bio: '',
        country: 'BR',
        avatarUrl: null,
        salt,
        passwordHash: await hashPassword(password, salt, PBKDF2_ITERATIONS),
        createdAt: new Date().toISOString(),
      }
      d.users.push(user)
      const session = openSession(id)
      return json(toAuthResponse(session, user), 201)
    }),
  ),

  http.post(
    '*/api/auth/login',
    resolver(async ({ request }) => {
      const parsed = await parseBody(request, loginRequestSchema)
      if ('response' in parsed) return parsed.response
      const { email, password } = parsed.data
      const user = getDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      const hash = user ? await hashPassword(password, user.salt, PBKDF2_ITERATIONS) : null
      if (!user || hash !== user.passwordHash) {
        return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
      }
      return json(toAuthResponse(openSession(user.id), user))
    }),
  ),

  http.get(
    '*/api/session',
    resolver(({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const body: SessionResponse = {
        user: { id: auth.user.id, displayName: auth.user.displayName, email: auth.user.email, avatarUrl: auth.user.avatarUrl },
        expiresAt: new Date(auth.session.expiresAt).toISOString(),
      }
      return json(body)
    }),
  ),

  http.post(
    '*/api/auth/logout',
    resolver(({ request }) => {
      const token = bearerToken(request)
      const d = getDb()
      d.sessions = d.sessions.filter((s) => s.token !== token)
      commit()
      return new Response(null, { status: 204 })
    }),
  ),
]
