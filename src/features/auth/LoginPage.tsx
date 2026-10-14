import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { AlertCircle, Info } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { loginRequestSchema, type LoginRequest } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { DEMO_CREDENTIALS } from '@/mocks/credentials'
import { AuthLayout } from './AuthLayout'
import { completeAuthentication, safeRedirect } from './session-manager'

const route = getRouteApi('/login')

export function LoginPage() {
  useDocumentTitle('Entrar')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const redirect = safeRedirect(search.redirect)
  const form = useForm<LoginRequest>({ resolver: zodResolver(loginRequestSchema), defaultValues: { email: '', password: '' }, mode: 'onSubmit' })
  const { register, handleSubmit, setError, setValue, formState: { errors } } = form

  const login = useMutation({
    mutationFn: (body: LoginRequest) => api.auth.login(body),
    onSuccess: async (auth) => {
      await completeAuthentication(auth)
      await navigate({ to: (redirect ?? '/') as '/', search: {}, replace: true })
    },
    onError: (error) => {
      const err = toApiError(error)
      for (const [field, message] of Object.entries(err.fields)) if (field === 'email' || field === 'password') setError(field, { message })
    },
  })
  const apiError = login.error ? toApiError(login.error) : null

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse sua conta para comprar, favoritar e gerenciar suas carteiras."
      footer={<>Ainda não tem conta? <Link to="/signup" search={{ redirect }} className="font-semibold text-accent underline underline-offset-4">Criar conta</Link></>}
    >
      {search.reason === 'expired' && (
        <p role="alert" className="mb-5 flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm" data-testid="session-expired-notice">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      <form onSubmit={handleSubmit((values) => login.mutate(values))} noValidate className="flex flex-col gap-5">
        <FormField id="email" label="E-mail" required error={errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" {...register('email')} />}
        </FormField>
        <FormField id="password" label="Senha" required error={errors.password?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...register('password')} />}
        </FormField>
        {apiError && !Object.keys(apiError.fields).length && (
          <p role="alert" className="flex gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger" data-testid="login-error">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {apiError.message}
          </p>
        )}
        <Button type="submit" size="lg" loading={login.isPending}>Entrar</Button>
      </form>

      {import.meta.env.VITE_ENABLE_MOCKS === 'true' && (
      <div className="mt-6 rounded-md border border-dashed border-border p-4 text-sm">
        <p className="mb-2 font-semibold">Credenciais de demonstração</p>
        <ul className="flex flex-col gap-2">
          {DEMO_CREDENTIALS.map((c) => (
            <li key={c.email} className="flex flex-wrap items-center justify-between gap-2">
              <span className="eth text-[13px] text-muted">{c.email} / {c.password}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => { setValue('email', c.email); setValue('password', c.password) }}>Usar</Button>
            </li>
          ))}
        </ul>
      </div>
      )}
    </AuthLayout>
  )
}
