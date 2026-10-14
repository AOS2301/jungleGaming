import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { pendingOrdersOptions } from '@/api/queries'
import { useSession } from '@/features/auth/session'

/**
 * Se já existe um pedido pendente (ex.: a página recarregou durante a compra), leva o usuário até ele
 * em vez de permitir uma segunda compra. Retorna a consulta para a página saber quando carregou.
 */
export function usePendingOrderRedirect() {
  const router = useRouter()
  const { scope } = useSession()
  const pending = useQuery(pendingOrdersOptions(scope))

  const existingOrder = pending.data?.[0]
  useEffect(() => {
    if (!existingOrder) return
    toast.info('Você já tem um pedido em andamento', { description: 'Mostramos o status dele em vez de criar outra compra.' })
    void router.navigate({ to: '/orders/$orderId', params: { orderId: existingOrder.id }, replace: true })
  }, [existingOrder, router])

  return pending
}
