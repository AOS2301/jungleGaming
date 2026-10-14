import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NetworkId, Wallet, WalletForm } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { qk, walletsOptions } from '@/api/queries'
import { useSession } from '@/features/auth/session'
import { announce } from '@/realtime/notices'
import { NETWORK_LABELS } from '@/lib/catalog'

export function useWallets() {
  const { scope, isAuthenticated } = useSession()
  return useQuery({ ...walletsOptions(scope), enabled: isAuthenticated })
}

function useWalletCache() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const key = qk.wallets(scope)
  return (wallet: Wallet) =>
    queryClient.setQueryData<Wallet[]>(key, (old) => {
      const list = old ?? []
      return list.some((w) => w.id === wallet.id) ? list.map((w) => (w.id === wallet.id ? wallet : w)) : [...list, wallet]
    })
}

export function useConnectWallet() {
  const setWallet = useWalletCache()
  return useMutation({
    mutationFn: ({ id, network }: { id: string; network: NetworkId }) => api.wallets.connect(id, network),
    onSuccess: (wallet) => {
      setWallet(wallet)
      announce(`Carteira ${wallet.label} conectada na rede ${NETWORK_LABELS[wallet.connection!.network]}.`)
    },
  })
}

export function useDisconnectWallet() {
  const setWallet = useWalletCache()
  return useMutation({
    mutationFn: (id: string) => api.wallets.disconnect(id),
    onSuccess: (wallet) => {
      setWallet(wallet)
      announce(`Carteira ${wallet.label} desconectada.`)
    },
  })
}

export function useSaveWallet() {
  const setWallet = useWalletCache()
  return useMutation({
    mutationFn: ({ id, form }: { id?: string; form: WalletForm }) => (id ? api.wallets.update(id, form) : api.wallets.create(form)),
    onSuccess: (wallet) => setWallet(wallet),
  })
}
