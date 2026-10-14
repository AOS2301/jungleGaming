/**
 * Chaves e opções de consulta do TanStack Query.
 *
 * Isolamento por usuário: tudo que é privado fica sob ['u', scope, ...], onde scope é o id do
 * usuário autenticado ou 'guest'. Os parâmetros da consulta fazem parte da chave, então
 * respostas de parâmetros antigos nunca sobrescrevem a lista atual (resposta fora de ordem).
 */
import { queryOptions } from '@tanstack/react-query'
import type { NetworkId, NftListQuery } from './contracts'
import { api } from './endpoints'

export const qk = {
  session: ['session'] as const,
  nfts: ['nfts'] as const,
  nftLists: ['nfts', 'list'] as const,
  nftList: (q: NftListQuery) => ['nfts', 'list', q] as const,
  nftFeatured: ['nfts', 'featured'] as const,
  nft: (id: string) => ['nfts', 'detail', id] as const,
  priv: (scope: string) => ['u', scope] as const,
  favorites: (scope: string) => ['u', scope, 'favorites'] as const,
  cart: (scope: string) => ['u', scope, 'cart'] as const,
  quotes: (scope: string) => ['u', scope, 'quote'] as const,
  quote: (scope: string, network: NetworkId) => ['u', scope, 'quote', network] as const,
  orders: (scope: string) => ['u', scope, 'orders'] as const,
  order: (scope: string, id: string) => ['u', scope, 'orders', id] as const,
  pendingOrders: (scope: string) => ['u', scope, 'orders', 'list', 'pending'] as const,
  profile: (scope: string) => ['u', scope, 'profile'] as const,
  wallets: (scope: string) => ['u', scope, 'wallets'] as const,
}

export const isPrivateKey = (key: readonly unknown[]) => key[0] === 'u'

export const nftListOptions = (query: NftListQuery) =>
  queryOptions({ queryKey: qk.nftList(query), queryFn: ({ signal }) => api.nfts.list(query, { signal }) })

export const featuredOptions = () => queryOptions({ queryKey: qk.nftFeatured, queryFn: ({ signal }) => api.nfts.featured({ signal }), staleTime: 60_000 })

export const nftDetailOptions = (id: string) =>
  queryOptions({ queryKey: qk.nft(id), queryFn: ({ signal }) => api.nfts.get(id, { signal }) })

export const cartOptions = (scope: string) => queryOptions({ queryKey: qk.cart(scope), queryFn: ({ signal }) => api.cart.get({ signal }), staleTime: 0 })

export const quoteOptions = (scope: string, network: NetworkId) =>
  queryOptions({ queryKey: qk.quote(scope, network), queryFn: ({ signal }) => api.cart.quote(network, { signal }), staleTime: 0 })

export const favoritesOptions = (scope: string) => queryOptions({ queryKey: qk.favorites(scope), queryFn: ({ signal }) => api.favorites.list({ signal }) })

export const orderOptions = (scope: string, id: string) =>
  queryOptions({ queryKey: qk.order(scope, id), queryFn: ({ signal }) => api.orders.get(id, { signal }), staleTime: 0 })

export const pendingOrdersOptions = (scope: string) =>
  queryOptions({ queryKey: qk.pendingOrders(scope), queryFn: ({ signal }) => api.orders.list('pending', { signal }), staleTime: 0 })

export const profileOptions = (scope: string) => queryOptions({ queryKey: qk.profile(scope), queryFn: ({ signal }) => api.profile.get({ signal }) })

export const walletsOptions = (scope: string) => queryOptions({ queryKey: qk.wallets(scope), queryFn: ({ signal }) => api.wallets.list({ signal }) })
