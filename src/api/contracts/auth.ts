import { z } from 'zod'
import { isoDate } from './common'

export const userSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const authResponseSchema = z.object({
  accessToken: z.string(),
  expiresAt: isoDate,
  user: userSchema,
})
export type AuthResponse = z.infer<typeof authResponseSchema>

export const sessionResponseSchema = z.object({ user: userSchema, expiresAt: isoDate })
export type SessionResponse = z.infer<typeof sessionResponseSchema>

export const PASSWORD_RULE_MESSAGE = 'Use ao menos 8 caracteres, com maiúscula, minúscula e número'
export const passwordSchema = z
  .string()
  .min(8, PASSWORD_RULE_MESSAGE)
  .regex(/[a-z]/, PASSWORD_RULE_MESSAGE)
  .regex(/[A-Z]/, PASSWORD_RULE_MESSAGE)
  .regex(/\d/, PASSWORD_RULE_MESSAGE)

export const loginRequestSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe sua senha'),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const signupRequestSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome (mín. 2 caracteres)').max(60),
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  password: passwordSchema,
})
export type SignupRequest = z.infer<typeof signupRequestSchema>
