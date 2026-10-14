import type { UseQueryResult } from '@tanstack/react-query'
import { CheckCircle2, Copy, Hourglass, RefreshCw, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import type { Order } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { NETWORK_LABELS } from '@/lib/catalog'
import { formatDateTime } from '@/lib/format'

/** Cabeçalho da página do pedido: muda conforme o estado (pendente, confirmado ou recusado). */
export function OrderStatusHeader({ order, query, realtimeConnected }: { order: Order; query: UseQueryResult<Order>; realtimeConnected: boolean }) {
  return (
    <div className="mb-10 flex flex-col items-center text-center">
      {order.status === 'pending' && <Pending order={order} query={query} realtimeConnected={realtimeConnected} />}
      {order.status === 'confirmed' && <Confirmed order={order} />}
      {order.status === 'declined' && <Declined order={order} />}
    </div>
  )
}

function Icon({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`mb-6 flex size-20 items-center justify-center rounded-full ${className}`}>{children}</span>
}

function Pending({ order, query, realtimeConnected }: { order: Order; query: UseQueryResult<Order>; realtimeConnected: boolean }) {
  return (
    <>
      <Icon className="animate-pulse-ring bg-primary/20 text-accent"><Hourglass className="size-9" aria-hidden /></Icon>
      <h1 className="text-3xl font-bold sm:text-4xl" data-testid="order-title">Aguardando confirmação</h1>
      <p role="status" className="mt-3 max-w-lg text-muted">
        Estamos confirmando sua transação na rede {NETWORK_LABELS[order.network]}. Você pode sair desta página: o status é atualizado em tempo real e é recuperado ao voltar.
      </p>
      {!realtimeConnected && (
        <p role="status" className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm" data-testid="realtime-down">
          A conexão em tempo real foi interrompida. Verificando o status periodicamente.
        </p>
      )}
      <Button variant="outline" className="mt-5" onClick={() => void query.refetch()} loading={query.isFetching}>
        <RefreshCw aria-hidden /> Atualizar agora
      </Button>
    </>
  )
}

function Confirmed({ order }: { order: Order }) {
  const tx = order.tx
  const copyHash = () => {
    if (!tx) return
    navigator.clipboard?.writeText(tx.hash).then(() => toast.success('Hash copiado'), () => toast.error('Não foi possível copiar'))
  }

  return (
    <>
      <Icon className="bg-success/15 text-success"><CheckCircle2 className="size-10" aria-hidden /></Icon>
      <h1 className="text-3xl font-bold sm:text-4xl" data-testid="order-title">Compra confirmada!</h1>
      <p role="status" className="mt-3 max-w-lg text-muted">Seus NFTs foram adicionados à sua coleção. Guarde o identificador da transação abaixo.</p>
      {tx && (
        <div className="mt-6 w-full max-w-xl rounded-lg border border-border bg-surface p-4 text-left" data-testid="tx">
          <p className="text-xs uppercase tracking-wide text-muted">Transação (simulada)</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="eth min-w-0 flex-1 break-all text-sm" data-testid="tx-hash">{tx.hash}</code>
            <Button variant="outline" size="icon-sm" aria-label="Copiar hash da transação" onClick={copyHash}><Copy aria-hidden /></Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Bloco {tx.blockNumber.toLocaleString('pt-BR')} · confirmada em {formatDateTime(tx.confirmedAt)} · sem registro on-chain real
          </p>
        </div>
      )}
    </>
  )
}

function Declined({ order }: { order: Order }) {
  return (
    <>
      <Icon className="bg-danger/15 text-danger"><XCircle className="size-10" aria-hidden /></Icon>
      <h1 className="text-3xl font-bold sm:text-4xl" data-testid="order-title">Pagamento recusado</h1>
      <p role="alert" className="mt-3 max-w-lg text-muted" data-testid="decline-reason">{order.decline?.message}</p>
      <p className="mt-2 text-sm text-muted">Seus itens continuam no carrinho — nenhuma compra foi concluída.</p>
    </>
  )
}
