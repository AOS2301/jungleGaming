import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { CheckCircle2, Copy, Hourglass, RefreshCw, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Order } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { orderOptions } from '@/api/queries'
import { Eth } from '@/components/common/Eth'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { COUNTRIES } from '@/api/contracts'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/catalog'
import { formatDateTime } from '@/lib/format'
import { useConnectionStatus } from '@/realtime/status'

const route = getRouteApi('/_auth/orders/$orderId')

function OrderSkeleton() {
  return (
    <div className="container-page max-w-3xl py-10" aria-busy="true" aria-label="Carregando pedido" data-testid="order-skeleton">
      <Skeleton className="mx-auto size-20 rounded-full" />
      <Skeleton className="mx-auto mt-6 h-10 w-72" />
      <Skeleton className="mx-auto mt-3 h-6 w-96 max-w-full" />
      <Skeleton className="mt-10 h-72 w-full rounded-lg" />
    </div>
  )
}

function Receipt({ order }: { order: Order }) {
  return (
    <section aria-labelledby="receipt-title" className="rounded-lg border border-border bg-surface p-5 sm:p-7" data-testid="receipt">
      <h2 id="receipt-title" className="mb-5 text-xl font-bold">{order.status === 'confirmed' ? 'Recibo' : 'Resumo do pedido'}</h2>
      <ul className="divide-y divide-border" aria-label="Itens do pedido">
        {order.items.map((i) => (
          <li key={`${i.nftId}-${i.editionId}`} className="flex items-center gap-4 py-4 first:pt-0">
            <img src={i.image.src} alt={i.image.alt} width={64} height={64} className="size-16 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{i.name}</p>
              <p className="text-sm text-muted">Edição {i.editionName} · {i.quantity} × <Eth value={i.unitPrice} showUnit={false} /></p>
            </div>
            <Eth value={i.lineTotal} className="font-bold" />
          </li>
        ))}
      </ul>
      <dl className="mt-2 flex flex-col gap-3 border-t border-border pt-5 text-[15px]">
        <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd data-testid="receipt-subtotal"><Eth value={order.subtotal} /></dd></div>
        <div className="flex justify-between"><dt className="text-muted">Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd data-testid="receipt-discount"><Eth value={order.discount} /></dd></div>
        <div className="flex justify-between"><dt className="text-muted">Taxa de rede ({NETWORK_LABELS[order.network]})</dt><dd data-testid="receipt-fee"><Eth value={order.networkFee} /></dd></div>
        <div className="flex items-baseline justify-between border-t border-border pt-4"><dt className="text-lg font-bold">Total</dt><dd className="text-2xl font-bold" data-testid="receipt-total"><Eth value={order.total} /></dd></div>
      </dl>
      <dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Carteira</dt><dd className="font-semibold">{order.wallet.label} · {PROVIDER_LABELS[order.wallet.provider]}</dd><dd className="eth text-muted">{order.wallet.addressMasked}</dd></div>
        <div><dt className="text-muted">Colecionador</dt><dd className="font-semibold">{order.collector.fullName}</dd><dd className="text-muted">{order.collector.email} · {COUNTRIES.find((c) => c.code === order.collector.country)?.name}</dd></div>
        <div><dt className="text-muted">Pedido</dt><dd className="eth font-semibold">{order.id}</dd></div>
        <div><dt className="text-muted">Criado em</dt><dd className="font-semibold">{formatDateTime(order.createdAt)}</dd></div>
      </dl>
    </section>
  )
}

export function OrderPage() {
  const { orderId } = route.useParams()
  const { scope } = useSession()
  const connection = useConnectionStatus()
  const order = useQuery({
    ...orderOptions(scope, orderId),
    // fallback: sem o canal em tempo real, consulta periodicamente enquanto o pedido está pendente
    refetchInterval: (q) => (q.state.data?.status === 'pending' && connection !== 'connected' ? 3_000 : false),
    retry: (count, error) => !(isApiError(error) && (error.status === 403 || error.status === 404)) && count < 2,
  })
  const data = order.data
  useDocumentTitle(data ? (data.status === 'confirmed' ? 'Compra confirmada' : data.status === 'declined' ? 'Pagamento recusado' : 'Aguardando confirmação') : 'Pedido')

  if (order.isPending) return <OrderSkeleton />
  if (order.isError && !data) {
    const err = order.error
    if (isApiError(err) && err.status === 403) {
      return <div className="container-page py-16"><EmptyState icon={ShieldAlert} title="Sem permissão para ver este pedido" description="Este pedido pertence a outra conta."><Button asChild><Link to="/">Voltar ao marketplace</Link></Button></EmptyState></div>
    }
    if (isApiError(err) && err.status === 404) {
      return <div className="container-page py-16"><EmptyState title="Pedido não encontrado" description={`Não encontramos o pedido “${orderId}”.`}><Button asChild><Link to="/">Voltar ao marketplace</Link></Button></EmptyState></div>
    }
    return <div className="container-page py-16"><ErrorState error={err} onRetry={() => void order.refetch()} retrying={order.isFetching} title="Não foi possível carregar o pedido" /></div>
  }
  const o = data!

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14" data-testid="order-page" data-order-id={o.id} data-status={o.status} data-version={o.version}>
      <div className="mb-10 flex flex-col items-center text-center">
        {o.status === 'pending' && (
          <>
            <span className="mb-6 flex size-20 animate-pulse-ring items-center justify-center rounded-full bg-primary/20 text-accent"><Hourglass className="size-9" aria-hidden /></span>
            <h1 className="text-3xl font-bold sm:text-4xl" data-testid="order-title">Aguardando confirmação</h1>
            <p role="status" className="mt-3 max-w-lg text-muted">Estamos confirmando sua transação na rede {NETWORK_LABELS[o.network]}. Você pode sair desta página: o status é atualizado em tempo real e é recuperado ao voltar.</p>
            {connection !== 'connected' && (
              <p role="status" className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm" data-testid="realtime-down">
                A conexão em tempo real foi interrompida. Verificando o status periodicamente.
              </p>
            )}
            <Button variant="outline" className="mt-5" onClick={() => void order.refetch()} loading={order.isFetching}><RefreshCw aria-hidden /> Atualizar agora</Button>
          </>
        )}
        {o.status === 'confirmed' && (
          <>
            <span className="mb-6 flex size-20 items-center justify-center rounded-full bg-success/15 text-success"><CheckCircle2 className="size-10" aria-hidden /></span>
            <h1 className="text-3xl font-bold sm:text-4xl" data-testid="order-title">Compra confirmada!</h1>
            <p role="status" className="mt-3 max-w-lg text-muted">Seus NFTs foram adicionados à sua coleção. Guarde o identificador da transação abaixo.</p>
            {o.tx && (
              <div className="mt-6 w-full max-w-xl rounded-lg border border-border bg-surface p-4 text-left" data-testid="tx">
                <p className="text-xs uppercase tracking-wide text-muted">Transação (simulada)</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="eth min-w-0 flex-1 break-all text-sm" data-testid="tx-hash">{o.tx.hash}</code>
                  <Button variant="outline" size="icon-sm" aria-label="Copiar hash da transação" onClick={() => void navigator.clipboard?.writeText(o.tx!.hash).then(() => toast.success('Hash copiado'), () => toast.error('Não foi possível copiar'))}>
                    <Copy aria-hidden />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted">Bloco {o.tx.blockNumber.toLocaleString('pt-BR')} · confirmada em {formatDateTime(o.tx.confirmedAt)} · sem registro on-chain real</p>
              </div>
            )}
          </>
        )}
        {o.status === 'declined' && (
          <>
            <span className="mb-6 flex size-20 items-center justify-center rounded-full bg-danger/15 text-danger"><XCircle className="size-10" aria-hidden /></span>
            <h1 className="text-3xl font-bold sm:text-4xl" data-testid="order-title">Pagamento recusado</h1>
            <p role="alert" className="mt-3 max-w-lg text-muted" data-testid="decline-reason">{o.decline?.message}</p>
            <p className="mt-2 text-sm text-muted">Seus itens continuam no carrinho — nenhuma compra foi concluída.</p>
          </>
        )}
      </div>

      <Receipt order={o} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {o.status === 'declined' && <Button asChild size="lg"><Link to="/checkout" search={{ step: 'review' }}>Tentar novamente</Link></Button>}
        {o.status === 'declined' && <Button asChild size="lg" variant="outline"><Link to="/cart">Voltar ao carrinho</Link></Button>}
        {o.status !== 'declined' && <Button asChild size="lg"><Link to="/">Continuar explorando</Link></Button>}
        {o.status === 'confirmed' && <Button asChild size="lg" variant="outline"><Link to="/wallets">Minhas carteiras</Link></Button>}
      </div>
    </div>
  )
}
