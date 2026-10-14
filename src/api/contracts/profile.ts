import { z } from 'zod'
import { isoDate } from './common'
import { passwordSchema } from './auth'

export const profileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  bio: z.string(),
  country: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: isoDate,
})
export type Profile = z.infer<typeof profileSchema>

export const profileFormSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome (mín. 2 caracteres)').max(60, 'Máximo de 60 caracteres'),
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo de 3 caracteres')
    .max(24, 'Máximo de 24 caracteres')
    .regex(/^[a-z0-9._]+$/, 'Use apenas letras minúsculas, números, ponto e _'),
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  bio: z.string().max(160, 'Máximo de 160 caracteres'),
  country: z.string().min(2, 'Selecione o país'),
})
export type ProfileForm = z.infer<typeof profileFormSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'A nova senha deve ser diferente da atual' })
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>
/** Corpo enviado à API (sem o campo de confirmação). */
export type ChangePasswordRequest = Pick<ChangePasswordForm, 'currentPassword' | 'newPassword'>

export const avatarResponseSchema = z.object({ avatarUrl: z.string().nullable() })
