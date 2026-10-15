import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { changePasswordSchema, PASSWORD_RULE_MESSAGE, type ChangePasswordForm } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { PasswordInput } from '@/components/ui/password-input'
import { announce } from '@/realtime/notices'
import { Card } from './Card'

export function PasswordCard() {
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordForm) => api.profile.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      reset()
      toast.success('Senha alterada')
      announce('Senha alterada com sucesso.')
    },
    onError: (error) => {
      const err = toApiError(error)
      for (const [field, message] of Object.entries(err.fields)) setError(field as keyof ChangePasswordForm, { message })
      if (Object.keys(err.fields).length === 0) toast.error('Não foi possível alterar a senha', { description: err.message })
    },
  })
  return (
    <Card title="Alterar senha" description="Por segurança, suas outras sessões serão encerradas.">
      <form onSubmit={handleSubmit((v) => change.mutate(v))} noValidate className="grid max-w-xl gap-5" aria-label="Alterar senha">
        <FormField id="pw-current" label="Senha atual" required error={errors.currentPassword?.message}>
          {(a) => <PasswordInput {...a} autoComplete="current-password" {...register('currentPassword')} />}
        </FormField>
        <FormField id="pw-new" label="Nova senha" required error={errors.newPassword?.message} hint={PASSWORD_RULE_MESSAGE}>
          {(a) => <PasswordInput {...a} autoComplete="new-password" {...register('newPassword')} />}
        </FormField>
        <FormField id="pw-confirm" label="Confirmar nova senha" required error={errors.confirmPassword?.message}>
          {(a) => <PasswordInput {...a} autoComplete="new-password" {...register('confirmPassword')} />}
        </FormField>
        <div><Button type="submit" loading={change.isPending}>Alterar senha</Button></div>
      </form>
    </Card>
  )
}
