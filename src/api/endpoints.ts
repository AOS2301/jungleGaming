/**
 * Funções de acesso à API REST. Cada chamada passa pelo Axios e tem a resposta validada
 * contra o contrato (zod) — qualquer divergência vira ApiError('contract').
 */
import type { ZodType } from 'zod'
import { http } from './client'
import { ApiError } from './errors'
import {
  authResponseSchema, avatarResponseSchema, cartSchema, favoritesResponseSchema, featuredResponseSchema,
  nftListResponseSchema, nftSchema, orderListSchema, orderSchema, profileSchema, quoteSchema, sessionResponseSchema,
  walletListSchema, walletSchema,
  type AddCartItemRequest, type ChangePasswordRequest, type CreateOrderRequest, type LoginRequest, type NetworkId,
  type NftListQuery, type ProfileForm, type SignupRequest, type WalletForm,
} from './contracts'

function parse<T>(schema: ZodType<T>, data: unknown, what: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ApiError({ kind: 'contract', code: 'CONTRACT_VIOLATION', message: `Resposta inesperada da API (${what}).`, details: result.error.issues })
  }
  return result.data
}

type Opts = { signal?: AbortSignal }

/** Serializa filtros: arrays viram CSV; valores vazios são omitidos. */
export function listParams(q: NftListQuery): Record<string, string> {
  const out: Record<string, string> = {}
  if (q.q) out.q = q.q
  if (q.category?.length) out.category = q.category.join(',')
  if (q.network?.length) out.network = q.network.join(',')
  if (q.minPrice) out.minPrice = q.minPrice
  if (q.maxPrice) out.maxPrice = q.maxPrice
  if (q.available) out.available = 'true'
  if (q.sort) out.sort = q.sort
  if (q.page) out.page = String(q.page)
  if (q.pageSize) out.pageSize = String(q.pageSize)
  return out
}

export const api = {
  auth: {
    signup: async (body: SignupRequest) => parse(authResponseSchema, (await http.post('/auth/signup', body)).data, 'signup'),
    login: async (body: LoginRequest) => parse(authResponseSchema, (await http.post('/auth/login', body)).data, 'login'),
    session: async ({ signal }: Opts = {}) => parse(sessionResponseSchema, (await http.get('/session', { signal })).data, 'session'),
    logout: async () => {
      await http.post('/auth/logout')
    },
  },
  nfts: {
    list: async (query: NftListQuery, { signal }: Opts = {}) =>
      parse(nftListResponseSchema, (await http.get('/nfts', { params: listParams(query), signal })).data, 'nfts'),
    featured: async ({ signal }: Opts = {}) => parse(featuredResponseSchema, (await http.get('/nfts/featured', { signal })).data, 'featured').items,
    get: async (id: string, { signal }: Opts = {}) => parse(nftSchema, (await http.get(`/nfts/${encodeURIComponent(id)}`, { signal })).data, 'nft'),
  },
  favorites: {
    list: async ({ signal }: Opts = {}) => parse(favoritesResponseSchema, (await http.get('/favorites', { signal })).data, 'favorites'),
    add: async (nftId: string) => parse(favoritesResponseSchema, (await http.put(`/favorites/${encodeURIComponent(nftId)}`)).data, 'favorites'),
    remove: async (nftId: string) => parse(favoritesResponseSchema, (await http.delete(`/favorites/${encodeURIComponent(nftId)}`)).data, 'favorites'),
  },
  cart: {
    get: async ({ signal }: Opts = {}) => parse(cartSchema, (await http.get('/cart', { signal })).data, 'cart'),
    quote: async (network: NetworkId, { signal }: Opts = {}) =>
      parse(quoteSchema, (await http.get('/cart/quote', { params: { network }, signal })).data, 'quote'),
    addItem: async (body: AddCartItemRequest) => parse(cartSchema, (await http.post('/cart/items', body)).data, 'cart'),
    updateItem: async (id: string, quantity: number) => parse(cartSchema, (await http.patch(`/cart/items/${id}`, { quantity })).data, 'cart'),
    removeItem: async (id: string) => parse(cartSchema, (await http.delete(`/cart/items/${id}`)).data, 'cart'),
    applyCoupon: async (code: string) => parse(cartSchema, (await http.put('/cart/coupon', { code })).data, 'cart'),
    removeCoupon: async () => parse(cartSchema, (await http.delete('/cart/coupon')).data, 'cart'),
    merge: async (guestToken: string) => parse(cartSchema, (await http.post('/cart/merge', { guestToken })).data, 'cart'),
  },
  orders: {
    /** Criação idempotente: a mesma Idempotency-Key + conteúdo devolve o mesmo pedido. */
    create: async (body: CreateOrderRequest, idempotencyKey: string) =>
      parse(orderSchema, (await http.post('/orders', body, { headers: { 'Idempotency-Key': idempotencyKey } })).data, 'order'),
    get: async (id: string, { signal }: Opts = {}) => parse(orderSchema, (await http.get(`/orders/${encodeURIComponent(id)}`, { signal })).data, 'order'),
    list: async (status?: string, { signal }: Opts = {}) =>
      parse(orderListSchema, (await http.get('/orders', { params: status ? { status } : undefined, signal })).data, 'orders').items,
  },
  profile: {
    get: async ({ signal }: Opts = {}) => parse(profileSchema, (await http.get('/profile', { signal })).data, 'profile'),
    update: async (body: ProfileForm) => parse(profileSchema, (await http.put('/profile', body)).data, 'profile'),
    uploadAvatar: async (file: Blob, filename: string) => {
      const form = new FormData()
      form.append('avatar', file, filename)
      return parse(avatarResponseSchema, (await http.post('/profile/avatar', form)).data, 'avatar')
    },
    removeAvatar: async () => parse(avatarResponseSchema, (await http.delete('/profile/avatar')).data, 'avatar'),
    changePassword: async (body: ChangePasswordRequest) => {
      await http.put('/profile/password', body)
    },
  },
  wallets: {
    list: async ({ signal }: Opts = {}) => parse(walletListSchema, (await http.get('/wallets', { signal })).data, 'wallets').items,
    create: async (body: WalletForm) => parse(walletSchema, (await http.post('/wallets', body)).data, 'wallet'),
    update: async (id: string, body: WalletForm) => parse(walletSchema, (await http.put(`/wallets/${id}`, body)).data, 'wallet'),
    connect: async (id: string, network: NetworkId) => parse(walletSchema, (await http.post(`/wallets/${id}/connect`, { network })).data, 'wallet'),
    disconnect: async (id: string) => parse(walletSchema, (await http.post(`/wallets/${id}/disconnect`)).data, 'wallet'),
  },
}
