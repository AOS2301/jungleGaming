import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Profile } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/errors'
import { qk } from '@/api/queries'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { syncSessionUser } from '@/features/auth/session-manager'
import { initials } from '@/lib/format'
import { resizeImage } from '@/lib/image'
import { announce } from '@/realtime/notices'
import { Card } from './Card'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function AvatarCard({ profile }: { profile: Profile }) {
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
            <input ref={inputRef} id="avatar-input" aria-label="Escolher foto de perfil" type="file" accept={AVATAR_TYPES.join(',')} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-describedby={error ? 'avatar-error' : undefined} />
            <Button type="button" variant="outline" loading={upload.isPending} onClick={() => inputRef.current?.click()}><Camera aria-hidden /> Alterar foto</Button>
            {profile.avatarUrl && <Button type="button" variant="ghost" onClick={() => remove.mutate()} loading={remove.isPending}><Trash2 aria-hidden /> Remover</Button>}
          </div>
          {error && <p id="avatar-error" role="alert" className="text-sm font-medium text-danger" data-testid="avatar-error">{error}</p>}
        </div>
      </div>
    </Card>
  )
}
