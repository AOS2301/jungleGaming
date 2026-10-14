import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { COUNTRIES, profileFormSchema, type Profile, type ProfileForm } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/errors'
import { qk } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSession } from '@/features/auth/session'
import { syncSessionUser } from '@/features/auth/session-manager'
import { announce } from '@/realtime/notices'
import { Card } from './Card'

export function ProfileFormCard({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const { register, control, handleSubmit, reset, setError, watch, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { displayName: profile.displayName, username: profile.username, email: profile.email, bio: profile.bio, country: profile.country },
  })
  const [saved, setSaved] = useState(false)
  const save = useMutation({
    mutationFn: (body: ProfileForm) => api.profile.update(body),
    onSuccess: (next) => {
      queryClient.setQueryData(qk.profile(scope), next)
      syncSessionUser({ displayName: next.displayName, email: next.email })
      reset({ displayName: next.displayName, username: next.username, email: next.email, bio: next.bio, country: next.country })
      setSaved(true)
      toast.success('Perfil atualizado')
      announce('Perfil atualizado com sucesso.')
    },
    onError: (error) => {
      const err = toApiError(error)
      for (const [field, message] of Object.entries(err.fields)) setError(field as keyof ProfileForm, { message })
      if (Object.keys(err.fields).length === 0) toast.error('Não foi possível salvar o perfil', { description: err.message })
    },
  })
  const bioLength = watch('bio')?.length ?? 0
  return (
    <Card title="Dados do colecionador" description="Essas informações aparecem no seu perfil e nos recibos.">
      <form onSubmit={handleSubmit((v) => { setSaved(false); save.mutate(v) })} noValidate className="grid gap-5 sm:grid-cols-2" aria-label="Dados do perfil">
        <FormField id="p-displayName" label="Nome" required error={errors.displayName?.message}>
          {(a) => <Input {...a} autoComplete="name" {...register('displayName')} />}
        </FormField>
        <FormField id="p-username" label="Nome de usuário" required error={errors.username?.message} hint="Letras minúsculas, números, ponto e _">
          {(a) => <Input {...a} autoComplete="username" {...register('username')} />}
        </FormField>
        <FormField id="p-email" label="E-mail" required error={errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
        </FormField>
        <FormField id="p-country" label="País" required error={errors.country?.message}>
          {(a) => (
            <Controller control={control} name="country" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={a.id}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          )}
        </FormField>
        <FormField id="p-bio" label="Bio" error={errors.bio?.message} hint={`${bioLength}/160 caracteres`} className="sm:col-span-2">
          {(a) => <Textarea {...a} rows={3} {...register('bio')} />}
        </FormField>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <Button type="submit" loading={save.isPending} disabled={!isDirty && !save.isPending}>Salvar alterações</Button>
          {saved && !isDirty && <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success" data-testid="profile-saved"><Check className="size-4" aria-hidden /> Alterações salvas</p>}
        </div>
      </form>
    </Card>
  )
}
