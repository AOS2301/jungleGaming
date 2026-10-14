import type { WalletSlot } from '@/api/contracts'
import { ErrorState } from '@/components/common/States'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useWallets } from './wallet-hooks'
import { WalletSlotCard } from './WalletSlotCard'

export function WalletsPage() {
  useDocumentTitle('Carteiras')
  const wallets = useWallets()
  if (wallets.isPending) {
    return (
      <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Carregando carteiras" data-testid="wallets-skeleton">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    )
  }
  if (wallets.isError) return <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} retrying={wallets.isFetching} title="Não foi possível carregar suas carteiras" />
  const bySlot = (slot: WalletSlot) => wallets.data.find((w) => w.slot === slot)
  return (
    <div>
      <p className="mb-6 max-w-2xl text-muted">Cadastre até duas carteiras. A principal é pré-selecionada no pagamento; a secundária serve como reserva. A conexão é simulada.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <WalletSlotCard slot="primary" wallet={bySlot('primary')} />
        <WalletSlotCard slot="secondary" wallet={bySlot('secondary')} />
      </div>
    </div>
  )
}
