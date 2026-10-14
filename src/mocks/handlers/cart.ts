import { http } from 'msw'
import { z } from 'zod'
import { addCartItemSchema, applyCouponSchema, networkSchema, type Cart } from '@/api/contracts'
import { commit, findOrCreateCart, getDb, cartOwner, nextId, type DbCart } from '../db'
import { buildQuote, evaluateCoupon, maxQuantityFor, serializeCart, touchCart } from '../domain'
import { apiError, bearerToken, authenticate, json, notFound, parseBody, resolver } from '../http'

const GUEST_HEADER = 'x-cart-token'

/** Resolve o carrinho do solicitante: do usuário autenticado ou do visitante (X-Cart-Token). */
function resolveCart(request: Request): { cart: DbCart; userId: string | null } | Response | { cart: null; userId: null } {
  if (bearerToken(request)) {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    return { cart: findOrCreateCart(cartOwner(auth.user.id, null)!), userId: auth.user.id }
  }
  const guest = request.headers.get(GUEST_HEADER)
  if (!guest) return { cart: null, userId: null }
  return { cart: findOrCreateCart(cartOwner(null, guest)!), userId: null }
}

const emptyCart = (): Cart => ({ id: 'cart_empty', items: [], couponCode: null, version: 0, updatedAt: new Date(Date.now()).toISOString() })

const availabilityConflict = (nftId: string, editionId: string, available: number, requested: number) =>
  apiError(409, 'AVAILABILITY_CONFLICT',
    available === 0
      ? 'Esta edição está esgotada.'
      : `Só é possível comprar até ${maxQuantityFor(available)} unidade(s) desta edição.`,
    { details: { nftId, editionId, available, max: maxQuantityFor(available), requested } })

export const cartHandlers = [
  http.get(
    '*/api/cart',
    resolver(({ request }) => {
      const r = resolveCart(request)
      if (r instanceof Response) return r
      return json(r.cart ? serializeCart(r.cart) : emptyCart())
    }),
  ),

  http.get(
    '*/api/cart/quote',
    resolver(({ request }) => {
      const r = resolveCart(request)
      if (r instanceof Response) return r
      const network = networkSchema.catch('ethereum').parse(new URL(request.url).searchParams.get('network') ?? 'ethereum')
      const items = (r.cart?.items ?? []).map((i) => ({ nftId: i.nftId, editionId: i.editionId, quantity: i.quantity, cartItemId: i.id }))
      return json(buildQuote(items, r.cart?.couponCode ?? null, network))
    }),
  ),

  http.post(
    '*/api/cart/items',
    resolver(async ({ request }) => {
      const r = resolveCart(request)
      if (r instanceof Response) return r
      if (!r.cart) return apiError(422, 'VALIDATION_FAILED', 'Carrinho não identificado (X-Cart-Token ausente).')
      const parsed = await parseBody(request, addCartItemSchema)
      if ('response' in parsed) return parsed.response
      const { nftId, editionId, quantity } = parsed.data
      const nft = getDb().nfts.find((n) => n.id === nftId)
      const edition = nft?.editions.find((e) => e.id === editionId)
      if (!nft || !edition) return notFound('NFT ou edição')
      const existing = r.cart.items.find((i) => i.nftId === nftId && i.editionId === editionId)
      const desired = (existing?.quantity ?? 0) + quantity
      if (edition.available === 0 || desired > maxQuantityFor(edition.available)) {
        return availabilityConflict(nftId, editionId, edition.available, desired)
      }
      if (existing) existing.quantity = desired
      else r.cart.items.push({ id: nextId('ci'), nftId, editionId, quantity })
      touchCart(r.cart)
      commit()
      return json(serializeCart(r.cart), 201)
    }),
  ),

  http.patch(
    '*/api/cart/items/:id',
    resolver(async ({ request, params }) => {
      const r = resolveCart(request)
      if (r instanceof Response) return r
      const item = r.cart?.items.find((i) => i.id === params.id)
      if (!r.cart || !item) return notFound('Item do carrinho')
      const parsed = await parseBody(request, z.object({ quantity: z.number().int().min(1, 'A quantidade mínima é 1') }))
      if ('response' in parsed) return parsed.response
      const edition = getDb().nfts.find((n) => n.id === item.nftId)?.editions.find((e) => e.id === item.editionId)
      if (!edition) return notFound('Edição')
      if (parsed.data.quantity > maxQuantityFor(edition.available)) {
        return availabilityConflict(item.nftId, item.editionId, edition.available, parsed.data.quantity)
      }
      item.quantity = parsed.data.quantity
      touchCart(r.cart)
      commit()
      return json(serializeCart(r.cart))
    }),
  ),

  http.delete(
    '*/api/cart/items/:id',
    resolver(({ request, params }) => {
      const r = resolveCart(request)
      if (r instanceof Response) return r
      if (!r.cart) return json(emptyCart())
      r.cart.items = r.cart.items.filter((i) => i.id !== params.id)
      if (r.cart.items.length === 0) r.cart.couponCode = null
      touchCart(r.cart)
      commit()
      return json(serializeCart(r.cart))
    }),
  ),

  http.put(
    '*/api/cart/coupon',
    resolver(async ({ request }) => {
      const r = resolveCart(request)
      if (r instanceof Response) return r
      if (!r.cart || r.cart.items.length === 0) return apiError(422, 'VALIDATION_FAILED', 'Adicione itens ao carrinho antes de aplicar um cupom.', { fields: { code: 'Carrinho vazio' } })
      const parsed = await parseBody(request, applyCouponSchema)
      if ('response' in parsed) return parsed.response
      const subtotal = buildQuote(r.cart.items, null, 'ethereum').subtotal
      const result = evaluateCoupon(parsed.data.code, subtotal)
      if (!result.ok) return apiError(422, result.error.code, result.error.message, { fields: { code: result.error.message } })
      r.cart.couponCode = result.coupon.code
      touchCart(r.cart)
      commit()
      return json(serializeCart(r.cart))
    }),
  ),

  http.delete(
    '*/api/cart/coupon',
    resolver(({ request }) => {
      const r = resolveCart(request)
      if (r instanceof Response) return r
      if (!r.cart) return json(emptyCart())
      r.cart.couponCode = null
      touchCart(r.cart)
      commit()
      return json(serializeCart(r.cart))
    }),
  ),

  /** Mescla o carrinho do visitante no do usuário autenticado (após login/cadastro). */
  http.post(
    '*/api/cart/merge',
    resolver(async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = await parseBody(request, z.object({ guestToken: z.string().min(1) }))
      if ('response' in parsed) return parsed.response
      const d = getDb()
      const mine = findOrCreateCart(cartOwner(auth.user.id, null)!)
      const guestIdx = d.carts.findIndex((c) => c.owner === cartOwner(null, parsed.data.guestToken))
      const guest = guestIdx >= 0 ? d.carts[guestIdx]! : null
      if (guest) {
        for (const gi of guest.items) {
          const edition = d.nfts.find((n) => n.id === gi.nftId)?.editions.find((e) => e.id === gi.editionId)
          if (!edition || edition.available === 0) continue
          const existing = mine.items.find((i) => i.nftId === gi.nftId && i.editionId === gi.editionId)
          const max = maxQuantityFor(edition.available)
          if (existing) existing.quantity = Math.min(max, existing.quantity + gi.quantity)
          else mine.items.push({ id: nextId('ci'), nftId: gi.nftId, editionId: gi.editionId, quantity: Math.min(max, gi.quantity) })
        }
        if (!mine.couponCode && guest.couponCode) mine.couponCode = guest.couponCode
        d.carts.splice(guestIdx, 1)
        touchCart(mine)
        commit()
      }
      return json(serializeCart(mine))
    }),
  ),
]
