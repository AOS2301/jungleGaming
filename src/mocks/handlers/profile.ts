import { http } from 'msw'
import { z } from 'zod'
import { passwordSchema, profileFormSchema, type Profile } from '@/api/contracts'
import { PBKDF2_ITERATIONS } from '../fixtures'
import { commit, getDb, type DbUser } from '../db'
import { apiError, authenticate, hashPassword, json, parseBody, randomToken, resolver } from '../http'

const RESERVED_USERNAMES = ['admin', 'jungle', 'root', 'suporte']
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const serialize = (u: DbUser): Profile => ({
  id: u.id,
  displayName: u.displayName,
  username: u.username,
  email: u.email,
  bio: u.bio,
  country: u.country,
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt,
})

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

export const profileHandlers = [
  http.get(
    '*/api/profile',
    resolver(({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      return json(serialize(auth.user))
    }),
  ),

  http.put(
    '*/api/profile',
    resolver(async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = await parseBody(request, profileFormSchema)
      if ('response' in parsed) return parsed.response
      const form = parsed.data
      const d = getDb()
      if (d.users.some((u) => u.id !== auth.user.id && u.email.toLowerCase() === form.email.toLowerCase())) {
        return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { fields: { email: 'Este e-mail já está em uso' } })
      }
      if (RESERVED_USERNAMES.includes(form.username) || d.users.some((u) => u.id !== auth.user.id && u.username === form.username)) {
        return apiError(409, 'USERNAME_TAKEN', 'Este nome de usuário não está disponível.', { fields: { username: 'Este nome de usuário não está disponível' } })
      }
      Object.assign(auth.user, form)
      commit()
      return json(serialize(auth.user))
    }),
  ),

  http.post(
    '*/api/profile/avatar',
    resolver(async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      let file: FormDataEntryValue | null = null
      try {
        file = (await request.formData()).get('avatar')
      } catch {
        /* corpo não é multipart */
      }
      if (!(file instanceof File)) return apiError(422, 'VALIDATION_FAILED', 'Envie uma imagem.', { fields: { avatar: 'Envie uma imagem' } })
      if (!AVATAR_TYPES.includes(file.type)) return apiError(422, 'VALIDATION_FAILED', 'Formato não suportado.', { fields: { avatar: 'Use PNG, JPEG ou WebP' } })
      if (file.size > MAX_AVATAR_BYTES) return apiError(422, 'VALIDATION_FAILED', 'Arquivo muito grande.', { fields: { avatar: 'A imagem deve ter no máximo 2 MB' } })
      const bytes = new Uint8Array(await file.arrayBuffer())
      auth.user.avatarUrl = `data:${file.type};base64,${toBase64(bytes)}`
      commit()
      return json({ avatarUrl: auth.user.avatarUrl })
    }),
  ),

  http.delete(
    '*/api/profile/avatar',
    resolver(({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      auth.user.avatarUrl = null
      commit()
      return json({ avatarUrl: null })
    }),
  ),

  http.put(
    '*/api/profile/password',
    resolver(async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = await parseBody(request, z.object({ currentPassword: z.string().min(1, 'Informe a senha atual'), newPassword: passwordSchema }))
      if ('response' in parsed) return parsed.response
      const current = await hashPassword(parsed.data.currentPassword, auth.user.salt, PBKDF2_ITERATIONS)
      if (current !== auth.user.passwordHash) {
        return apiError(422, 'VALIDATION_FAILED', 'Senha atual incorreta.', { fields: { currentPassword: 'Senha atual incorreta' } })
      }
      auth.user.salt = randomToken('salt')
      auth.user.passwordHash = await hashPassword(parsed.data.newPassword, auth.user.salt, PBKDF2_ITERATIONS)
      // encerra as demais sessões do usuário, mantendo a atual
      const d = getDb()
      d.sessions = d.sessions.filter((s) => s.userId !== auth.user.id || s.token === auth.session.token)
      commit()
      return new Response(null, { status: 204 })
    }),
  ),
]
