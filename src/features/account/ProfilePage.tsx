import { useQuery } from '@tanstack/react-query'
import { profileOptions } from '@/api/queries'
import { ErrorState } from '@/components/common/States'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { AvatarCard } from './AvatarCard'
import { PasswordCard } from './PasswordCard'
import { ProfileFormCard } from './ProfileFormCard'

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
