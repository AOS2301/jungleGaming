import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
import { useEffect } from 'react'
import type { Order } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { orderOptions } from '@/api/queries'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { clearDraft } from '@/features/checkout/storage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useConnectionStatus } from '@/realtime/status'
import { OrderSkeleton } from './OrderSkeleton'
import { OrderStatusHeader } from './OrderStatusHeader'
import { Receipt } from './Receipt'

const route = getRouteApi('/_auth/orders/$orderId')

const TITLES: Record<Order['status'], string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Compra confirmada',
  declined: 'Pagamento recusado',
}

/** Página do pedido: estado (pendente/confirmado/recusado) + recibo. Atualiza sozinha por Socket.IO. */
export function OrderPage() {
  const { orderId } = route.useParams()
  const { scope, user } = useSession()
  const realtimeConnected = useConnectionStatus() === 'connected'

  const query = useQuery({
    ...orderOptions(scope, orderId),
    // Plano B: sem o canal em tempo real, consulta a cada 3 s enquanto o pedido está pendente.
    refetchInterval: (q) => (q.state.data?.status === 'pending' && !realtimeConnected ? 3_000 : false),
    retry: (count, error) => !(isApiError(error) && [403, 404].includes(error.status ?? 0)) && count < 2,
  })
  const order = query.data
  useDocumentTitle(order ? TITLES[order.status] : 'Pedido')

  // Compra concluída: o rascunho do checkout não é mais necessário (se falhar, ele é mantido para tentar de novo).
  useEffect(() => {
    if (order?.status === 'confirmed' && user) clearDraft(user.id)
  }, [order?.status, user])

  if (query.isPending) return <OrderSkeleton />
  if (!order) return <OrderError error={query.error} orderId={orderId} onRetry={() => void query.refetch()} retrying={query.isFetching} />

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14" data-testid="order-page" data-order-id={order.id} data-status={order.status} data-version={order.version}>
      <OrderStatusHeader order={order} query={query} realtimeConnected={realtimeConnected} />
      <Receipt order={order} />
      <OrderActions status={order.status} />
    </div>
  )
}

function OrderActions({ status }: { status: Order['status'] }) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
      {status === 'declined' ? (
        <>
          <Button asChild size="lg"><Link to="/checkout" search={{ step: 'review' }}>Tentar novamente</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/cart">Voltar ao carrinho</Link></Button>
        </>
      ) : (
        <Button asChild size="lg"><Link to="/">Continuar explorando</Link></Button>
      )}
      {status === 'confirmed' && <Button asChild size="lg" variant="outline"><Link to="/wallets">Minhas carteiras</Link></Button>}
    </div>
  )
}

function OrderError({ error, orderId, onRetry, retrying }: { error: unknown; orderId: string; onRetry: () => void; retrying: boolean }) {
  const status = isApiError(error) ? error.status : null
  return (
    <div className="container-page py-16">
      {status === 403 ? (
        <EmptyState icon={ShieldAlert} title="Sem permissão para ver este pedido" description="Este pedido pertence a outra conta.">
          <Button asChild><Link to="/">Voltar ao marketplace</Link></Button>
        </EmptyState>
      ) : status === 404 ? (
        <EmptyState title="Pedido não encontrado" description={`Não encontramos o pedido “${orderId}”.`}>
          <Button asChild><Link to="/">Voltar ao marketplace</Link></Button>
        </EmptyState>
      ) : (
        <ErrorState error={error} onRetry={onRetry} retrying={retrying} title="Não foi possível carregar o pedido" />
      )}
    </div>
  )
}
