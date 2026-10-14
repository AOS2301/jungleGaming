import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { FavoritesResponse } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/errors'
import { favoritesOptions, qk } from '@/api/queries'
import { useSession } from '@/features/auth/session'
import { announce } from '@/realtime/notices'

export function useFavoriteIds(): Set<string> {
  const { scope, isAuthenticated } = useSession()
  const { data } = useQuery({ ...favoritesOptions(scope), enabled: isAuthenticated })
  return new Set(data?.nftIds ?? [])
}

/**
 * Favoritar/desfavoritar com atualização otimista: o coração muda na hora; se a API falhar,
 * o estado volta ao snapshot anterior (rollback) e o usuário é avisado. Só a última mutation
 * em andamento revalida o cache, evitando que respostas fora de ordem pisem no estado final.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { scope, isAuthenticated } = useSession()
  const key = qk.favorites(scope)

  const mutation = useMutation({
    mutationKey: ['favorite', scope],
    mutationFn: ({ nftId, next }: { nftId: string; name: string; next: boolean }) => (next ? api.favorites.add(nftId) : api.favorites.remove(nftId)),
    onMutate: async ({ nftId, next }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      queryClient.setQueryData<FavoritesResponse>(key, (old) => {
        const ids = new Set(old?.nftIds ?? [])
        if (next) ids.add(nftId)
        else ids.delete(nftId)
        return { nftIds: [...ids] }
      })
      return { previous }
    },
    onError: (error, vars, ctx) => {
      queryClient.setQueryData(key, ctx?.previous)
      const err = toApiError(error)
      if (err.status !== 401) {
        toast.error(`Não foi possível ${vars.next ? 'favoritar' : 'remover dos favoritos'} “${vars.name}”`, { description: `${err.message} O estado anterior foi restaurado.` })
        announce(`Falha ao atualizar favorito de ${vars.name}. Alteração desfeita.`)
      }
    },
    onSuccess: (_d, vars) => announce(vars.next ? `${vars.name} adicionado aos favoritos.` : `${vars.name} removido dos favoritos.`),
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ['favorite', scope] }) === 1) void queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return {
    isPending: mutation.isPending,
    toggle: (nft: { id: string; name: string }, currentlyFavorite: boolean) => {
      if (!isAuthenticated) {
        toast.info('Entre para favoritar NFTs')
        void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
        return
      }
      mutation.mutate({ nftId: nft.id, name: nft.name, next: !currentlyFavorite })
    },
  }
}
