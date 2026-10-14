import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Check, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  changePasswordSchema, COUNTRIES, PASSWORD_RULE_MESSAGE, profileFormSchema,
  type ChangePasswordForm, type Profile, type ProfileForm,
} from '@/api/contracts'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/errors'
import { profileOptions, qk } from '@/api/queries'
import { ErrorState } from '@/components/common/States'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import { syncSessionUser } from '@/features/auth/session-manager'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { initials } from '@/lib/format'
import { resizeImage } from '@/lib/image'
import { announce } from '@/realtime/notices'
import { Controller } from 'react-hook-form'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const id = title.toLowerCase().replace(/\W+/g, '-')
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-surface p-5 sm:p-7">
      <h2 id={id} className="text-xl font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function AvatarCard({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()

  const apply = (avatarUrl: string | null) => {
    queryClient.setQueryData<Profile>(qk.profile(scope), (old) => old && { ...old, avatarUrl })
    syncSessionUser({ avatarUrl })
  }
  const upload = useMutation({
    mutationFn: async (file: File) => api.profile.uploadAvatar(await resizeImage(file), 'avatar.webp'),
    onSuccess: ({ avatarUrl }) => {
      apply(avatarUrl)
      toast.success('Foto de perfil atualizada')
      announce('Foto de perfil atualizada.')
    },
    onError: (e) => setError(toApiError(e).fields.avatar ?? toApiError(e).message),
  })
  const remove = useMutation({
    mutationFn: () => api.profile.removeAvatar(),
    onSuccess: () => {
      apply(null)
      toast.success('Foto removida')
    },
    onError: (e) => setError(toApiError(e).message),
  })

  const onFile = (file: File | undefined) => {
    setError(undefined)
    if (!file) return
    if (!AVATAR_TYPES.includes(file.type)) return setError('Formato não suportado. Use PNG, JPEG ou WebP.')
    if (file.size > MAX_AVATAR_BYTES) return setError('A imagem deve ter no máximo 2 MB.')
    upload.mutate(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Card title="Foto de perfil" description="PNG, JPEG ou WebP de até 2 MB. A imagem é reduzida para 256 px.">
      <div className="flex flex-wrap items-center gap-6">
        <Avatar className="size-24" data-testid="profile-avatar">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={`Foto de ${profile.displayName}`} />}
          <AvatarFallback className="text-2xl">{initials(profile.displayName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <input ref={inputRef} id="avatar-input" type="file" accept={AVATAR_TYPES.join(',')} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-describedby={error ? 'avatar-error' : undefined} />
            <Button type="button" variant="outline" loading={upload.isPending} onClick={() => inputRef.current?.click()}><Camera aria-hidden /> Alterar foto</Button>
            {profile.avatarUrl && <Button type="button" variant="ghost" onClick={() => remove.mutate()} loading={remove.isPending}><Trash2 aria-hidden /> Remover</Button>}
          </div>
          {error && <p id="avatar-error" role="alert" className="text-sm font-medium text-danger" data-testid="avatar-error">{error}</p>}
        </div>
      </div>
    </Card>
  )
}

function ProfileFormCard({ profile }: { profile: Profile }) {
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

function PasswordCard() {
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

export function ProfilePage() {
  useDocumentTitle('Perfil')
  const { scope } = useSession()
  const profile = useQuery(profileOptions(scope))

  if (profile.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando perfil" data-testid="profile-skeleton">
        <Skeleton className="h-44 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} retrying={profile.isFetching} title="Não foi possível carregar o perfil" />
  return (
    <div className="flex flex-col gap-6">
      <AvatarCard profile={profile.data} />
      <ProfileFormCard key={profile.data.id} profile={profile.data} />
      <PasswordCard />
    </div>
  )
}
