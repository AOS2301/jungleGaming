import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { PASSWORD_RULE_MESSAGE, signupRequestSchema, type SignupRequest } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { AuthLayout } from './AuthLayout'
import { completeAuthentication, safeRedirect } from './session-manager'

const route = getRouteApi('/signup')

export function SignupPage() {
  useDocumentTitle('Criar conta')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const redirect = safeRedirect(search.redirect)
  const { register, handleSubmit, setError, setFocus, formState: { errors } } = useForm<SignupRequest>({
    resolver: zodResolver(signupRequestSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  })

  const signup = useMutation({
    mutationFn: (body: SignupRequest) => api.auth.signup(body),
    onSuccess: async (auth) => {
      await completeAuthentication(auth)
      await navigate({ to: (redirect ?? '/') as '/', search: {}, replace: true })
    },
    onError: (error) => {
      const err = toApiError(error)
      let focused = false
      for (const [field, message] of Object.entries(err.fields)) {
        if (field === 'displayName' || field === 'email' || field === 'password') {
          setError(field, { message })
          if (!focused) { setFocus(field); focused = true }
        }
      }
    },
  })
  const apiError = signup.error ? toApiError(signup.error) : null

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Leva menos de um minuto. Seu carrinho atual será mantido."
      footer={<>Já tem conta? <Link to="/login" search={{ redirect }} className="font-semibold text-accent underline underline-offset-4">Entrar</Link></>}
    >
      <form onSubmit={handleSubmit((v) => signup.mutate(v))} noValidate className="flex flex-col gap-5">
        <FormField id="displayName" label="Nome" required error={errors.displayName?.message}>
          {(a11y) => <Input {...a11y} autoComplete="name" placeholder="Como devemos te chamar?" {...register('displayName')} />}
        </FormField>
        <FormField id="email" label="E-mail" required error={errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" {...register('email')} />}
        </FormField>
        <FormField id="password" label="Senha" required error={errors.password?.message} hint={PASSWORD_RULE_MESSAGE}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" {...register('password')} />}
        </FormField>
        {apiError && !Object.keys(apiError.fields).length && (
          <p role="alert" className="flex gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {apiError.message}
          </p>
        )}
        <Button type="submit" size="lg" loading={signup.isPending}>Criar conta</Button>
      </form>
    </AuthLayout>
  )
}
