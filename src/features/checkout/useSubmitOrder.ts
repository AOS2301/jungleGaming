import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useRef } from 'react'
import { quoteSchema, type CreateOrderRequest, type NetworkId } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { isOutcomeUnknown, toApiError } from '@/api/errors'
import { qk } from '@/api/queries'
import { useSession } from '@/features/auth/session'
import { announce } from '@/realtime/notices'
import { clearIdempotencyKey, getIdempotencyKey } from './storage'

/**
 * Envia o pedido sem nunca duplicar a compra:
 *  - a `Idempotency-Key` fica guardada: reenviar o MESMO pedido reutiliza a chave e o servidor devolve o mesmo pedido;
 *  - se não houver resposta (timeout/rede), repete sozinho até 2 vezes com a mesma chave;
 *  - cliques repetidos são ignorados enquanto há um envio em andamento.
 */
export function useSubmitOrder(network: NetworkId) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { user, scope } = useSession()
  const userId = user!.id
  const sending = useRef(false)

  const mutation = useMutation({
    mutationFn: (payload: CreateOrderRequest) => api.orders.create(payload, getIdempotencyKey(userId, payload)),
    retry: (failureCount, error) => isOutcomeUnknown(error) && failureCount < 2,
    retryDelay: 800,
    onSuccess: (order) => {
      clearIdempotencyKey(userId) // o rascunho do formulário só é apagado quando o pedido é confirmado (OrderPage)
      queryClient.setQueryData(qk.order(scope, order.id), order)
      void queryClient.invalidateQueries({ queryKey: qk.pendingOrders(scope) })
      void router.navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
    },
    onError: (error) => {
      const err = toApiError(error)
      // Falha definitiva: a próxima tentativa é outro pedido, com outra chave.
      if (!isOutcomeUnknown(err) && err.status !== 503) clearIdempotencyKey(userId)

      // Quando o servidor recusa por mudança de valores, ele manda a cotação nova.
      const newQuote = quoteSchema.safeParse((err.details as { quote?: unknown } | undefined)?.quote)
      if (newQuote.success) queryClient.setQueryData(qk.quote(scope, network), newQuote.data)

      if (err.code === 'QUOTE_CHANGED') announce('Os valores do pedido mudaram. Revise e confirme novamente.')
      if (err.code === 'WALLET_NOT_CONNECTED') void queryClient.invalidateQueries({ queryKey: qk.wallets(scope) })
      void queryClient.invalidateQueries({ queryKey: qk.cart(scope) })
    },
    onSettled: () => {
      sending.current = false
    },
  })

  const submit = (payload: CreateOrderRequest) => {
    if (sending.current || mutation.isPending) return
    sending.current = true // trava no mesmo instante do clique, antes de a tela atualizar
    mutation.mutate(payload)
  }

  return {
    submit,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    /** Quantas tentativas já falharam nesse envio (útil para mostrar "reenviando"). */
    failureCount: mutation.failureCount,
    error: mutation.error ? toApiError(mutation.error) : null,
  }
}
