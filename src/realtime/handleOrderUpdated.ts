import { toast } from 'sonner'
import type { Order, OrderUpdatedEvent } from '@/api/contracts'
import { qk } from '@/api/queries'
import { announce } from './notices'
import type { EventOutcome, ProcessorContext } from './types'

const isFinal = (status: Order['status']) => status === 'confirmed' || status === 'declined'

/**
 * `order.updated`: coloca o estado novo do pedido no cache.
 * Ignora eventos de outro usuário, antigos, e nunca "desfaz" um estado final (confirmado/recusado).
 */
export function handleOrderUpdated(event: OrderUpdatedEvent, ctx: ProcessorContext): EventOutcome {
  if (ctx.userId === null || event.userId !== ctx.userId) return 'ignored-user'

  const { queryClient } = ctx
  const scope = ctx.userId
  const orderId = event.resource.id
  const previous = queryClient.getQueryData<Order>(qk.order(scope, orderId))

  if (previous) {
    if (event.version <= previous.version) return 'stale'
    if (isFinal(previous.status) && previous.status !== event.data.status) return 'stale'
  }

  const order = event.data.order
  queryClient.setQueryData(qk.order(scope, orderId), order)
  void queryClient.invalidateQueries({ queryKey: qk.pendingOrders(scope) })

  if (isFinal(order.status)) {
    // O servidor tirou os itens comprados do carrinho: busca o carrinho e a cotação de novo.
    void queryClient.invalidateQueries({ queryKey: qk.cart(scope) })
    void queryClient.invalidateQueries({ queryKey: qk.quotes(scope) })
    const justFinished = !previous || previous.status === 'pending'
    if (justFinished) notifyOrderFinished(order, ctx)
  }
  return 'applied'
}

function notifyOrderFinished(order: Order, ctx: ProcessorContext): void {
  const confirmed = order.status === 'confirmed'
  const text = confirmed ? 'Pedido confirmado! Sua compra foi concluída.' : 'Pagamento recusado. Seus itens continuam no carrinho.'
  announce(text)

  // Quem já está olhando o pedido não precisa do toast.
  if (window.location.pathname === `/orders/${order.id}`) return
  toast[confirmed ? 'success' : 'error'](text, {
    id: `order-${order.id}`,
    action: { label: confirmed ? 'Ver recibo' : 'Ver detalhes', onClick: () => ctx.navigate(`/orders/${order.id}`) },
  })
}
