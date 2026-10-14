import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AddCartItemRequest, Cart, NetworkId } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/errors'
import { cartOptions, qk, quoteOptions } from '@/api/queries'
import { useSession } from '@/features/auth/session'
import { ensureGuestCartToken } from '@/features/auth/token-store'
import { announce } from '@/realtime/notices'

export const DEFAULT_NETWORK: NetworkId = 'ethereum'

export function useCart() {
  const { scope } = useSession()
  return useQuery(cartOptions(scope))
}

export function useCartCount(): number {
  const { data } = useCart()
  return data?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0
}

/** Cotação (subtotal, desconto, taxa de rede e total) — sempre calculada pela API. */
export function useQuote(network: NetworkId = DEFAULT_NETWORK) {
  const { scope } = useSession()
  return useQuery({ ...quoteOptions(scope, network), placeholderData: keepPreviousData })
}

function useCartMutationBase() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const key = qk.cart(scope)
  const refreshQuote = () => queryClient.invalidateQueries({ queryKey: qk.quotes(scope) })
  return { queryClient, scope, key, refreshQuote }
}

export function useAddToCart() {
  const { queryClient, key, refreshQuote } = useCartMutationBase()
  return useMutation({
    mutationFn: async (body: AddCartItemRequest & { name: string }) => {
      const { name: _name, ...request } = body
      void _name
      ensureGuestCartToken() // visitante: cria o token do carrinho anônimo na primeira adição
      return api.cart.addItem(request)
    },
    onSuccess: (cart, vars) => {
      queryClient.setQueryData(key, cart)
      void refreshQuote()
      announce(`${vars.name} adicionado ao carrinho.`)
    },
    onError: (error, vars) => {
      const err = toApiError(error)
      if (err.status !== 401) toast.error(`Não foi possível adicionar “${vars.name}”`, { description: err.message })
    },
  })
}

/** Altera quantidade com atualização otimista e rollback em caso de falha. */
export function useUpdateCartItem() {
  const { queryClient, key, refreshQuote } = useCartMutationBase()
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number; name: string }) => api.cart.updateItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      queryClient.setQueryData<Cart>(key, (old) => old && { ...old, items: old.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)) })
      return { previous }
    },
    onError: (error, vars, ctx) => {
      queryClient.setQueryData(key, ctx?.previous)
      const err = toApiError(error)
      if (err.status !== 401) toast.error(`Não foi possível alterar “${vars.name}”`, { description: err.message })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void refreshQuote()
    },
  })
}

export function useRemoveCartItem() {
  const { queryClient, key, refreshQuote } = useCartMutationBase()
  return useMutation({
    mutationFn: ({ itemId }: { itemId: string; name: string }) => api.cart.removeItem(itemId),
    onMutate: async ({ itemId }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      queryClient.setQueryData<Cart>(key, (old) => old && { ...old, items: old.items.filter((i) => i.id !== itemId) })
      return { previous }
    },
    onSuccess: (cart, vars) => {
      queryClient.setQueryData(key, cart)
      announce(`${vars.name} removido do carrinho.`)
    },
    onError: (error, vars, ctx) => {
      queryClient.setQueryData(key, ctx?.previous)
      const err = toApiError(error)
      if (err.status !== 401) toast.error(`Não foi possível remover “${vars.name}”`, { description: err.message })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void refreshQuote()
    },
  })
}

export function useApplyCoupon() {
  const { queryClient, key, refreshQuote } = useCartMutationBase()
  return useMutation({
    mutationFn: (code: string) => api.cart.applyCoupon(code),
    onSuccess: (cart) => {
      queryClient.setQueryData(key, cart)
      void refreshQuote()
      announce(`Cupom ${cart.couponCode} aplicado.`)
    },
  })
}

export function useRemoveCoupon() {
  const { queryClient, key, refreshQuote } = useCartMutationBase()
  return useMutation({
    mutationFn: () => api.cart.removeCoupon(),
    onSuccess: (cart) => {
      queryClient.setQueryData(key, cart)
      void refreshQuote()
      announce('Cupom removido.')
    },
    onError: (error) => toast.error('Não foi possível remover o cupom', { description: toApiError(error).message }),
  })
}
