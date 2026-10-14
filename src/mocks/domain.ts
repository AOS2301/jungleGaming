/** Regras de negócio da API simulada: busca no catálogo, carrinho e cotação. */
import type { Cart, CartItem, Nft, NftListResponse, Quote, QuoteLine, NetworkId } from '@/api/contracts'
import { categorySchema, networkSchema, sortSchema } from '@/api/contracts'
import { ethAdd, ethCompare, ethIsZero, ethMin, ethMulInt, ethPercent, ethSub, isEthString } from '@/lib/decimal'
import { CATEGORY_LABELS, MAX_QTY_PER_LINE, PAGE_SIZE } from '@/lib/catalog'
import { cyrb53 } from './http'
import { coupons } from './fixtures'
import { getDb, nowIso, type DbCart } from './db'
import { getScenario } from './scenarios'

// ---------- catálogo ----------
const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export function parseListParams(url: URL) {
  const sp = url.searchParams
  const csv = (key: string) => (sp.get(key) ?? '').split(',').map((v) => v.trim()).filter(Boolean)
  const q = sp.get('q')?.trim() || null
  const category = csv('category').filter((c) => categorySchema.safeParse(c).success)
  const network = csv('network').filter((n) => networkSchema.safeParse(n).success)
  const minRaw = sp.get('minPrice')
  const maxRaw = sp.get('maxPrice')
  const minPrice = minRaw && isEthString(minRaw) ? minRaw : null
  const maxPrice = maxRaw && isEthString(maxRaw) ? maxRaw : null
  const available = sp.get('available') === 'true'
  const sortParsed = sortSchema.safeParse(sp.get('sort'))
  const sort = sortParsed.success ? sortParsed.data : 'featured'
  const page = Math.max(1, Number.parseInt(sp.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(48, Math.max(1, Number.parseInt(sp.get('pageSize') ?? String(PAGE_SIZE), 10) || PAGE_SIZE))
  return { q, category, network, minPrice, maxPrice, available, sort, page, pageSize }
}

type ListParams = ReturnType<typeof parseListParams>

function matches(n: Nft, p: ListParams, skip?: 'category' | 'network'): boolean {
  if (skip !== 'category' && p.category.length && !p.category.includes(n.category)) return false
  if (skip !== 'network' && p.network.length && !p.network.includes(n.network)) return false
  if (p.minPrice && ethCompare(n.priceFrom, p.minPrice) < 0) return false
  if (p.maxPrice && ethCompare(n.priceFrom, p.maxPrice) > 0) return false
  if (p.available && n.available === 0) return false
  if (p.q) {
    const haystack = normalize(`${n.name} ${n.collection.name} ${n.creator.name} ${CATEGORY_LABELS[n.category]}`)
    if (!normalize(p.q).split(/\s+/).every((t) => haystack.includes(t))) return false
  }
  return true
}

export function queryNfts(params: ListParams): NftListResponse {
  const { q, category, network, minPrice, maxPrice, available, sort, pageSize } = params
  const all = getScenario().catalog === 'empty' ? [] : getDb().nfts
  const facet = (skip: 'category' | 'network', key: 'category' | 'network') => {
    const counts: Record<string, number> = {}
    for (const n of all) if (matches(n, params, skip)) counts[n[key]] = (counts[n[key]] ?? 0) + 1
    return counts
  }
  let items = all.filter((n) => matches(n, params))
  const byId = (a: Nft, b: Nft) => a.id.localeCompare(b.id)
  items = [...items].sort((a, b) => {
    switch (sort) {
      case 'newest':
        return b.createdAt.localeCompare(a.createdAt) || byId(a, b)
      case 'popular':
        return b.popularity - a.popularity || byId(a, b)
      case 'price_asc':
        return ethCompare(a.priceFrom, b.priceFrom) || byId(a, b)
      case 'price_desc':
        return ethCompare(b.priceFrom, a.priceFrom) || byId(a, b)
      default:
        return Number(b.featured) - Number(a.featured) || b.popularity - a.popularity || byId(a, b)
    }
  })
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(params.page, totalPages)
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total,
    totalPages,
    facets: { category: facet('category', 'category'), network: facet('network', 'network') },
    query: { q, category, network, minPrice, maxPrice, available, sort },
  }
}

// ---------- carrinho ----------
export function serializeCart(cart: DbCart): Cart {
  const d = getDb()
  const items: CartItem[] = []
  for (const it of cart.items) {
    const nft = d.nfts.find((n) => n.id === it.nftId)
    const edition = nft?.editions.find((e) => e.id === it.editionId)
    if (!nft || !edition) continue
    items.push({
      id: it.id,
      nftId: nft.id,
      editionId: edition.id,
      quantity: it.quantity,
      name: nft.name,
      editionName: edition.name,
      image: nft.images[0]!,
      unitPrice: edition.price,
      available: edition.available,
    })
  }
  return { id: cart.id, items, couponCode: cart.couponCode, version: cart.version, updatedAt: cart.updatedAt }
}

export const maxQuantityFor = (available: number) => Math.min(available, MAX_QTY_PER_LINE)

export function touchCart(cart: DbCart): void {
  cart.version += 1
  cart.updatedAt = nowIso()
}

// ---------- cupom e cotação ----------
export function evaluateCoupon(code: string, subtotal: string):
  | { ok: true; coupon: NonNullable<Quote['coupon']>; discount: string }
  | { ok: false; error: { code: 'COUPON_INVALID' | 'COUPON_EXPIRED' | 'COUPON_MIN_NOT_MET'; message: string } } {
  const found = coupons.find((c) => c.code === code.trim().toUpperCase())
  if (!found) return { ok: false, error: { code: 'COUPON_INVALID', message: 'Cupom inválido.' } }
  if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: { code: 'COUPON_EXPIRED', message: 'Este cupom expirou.' } }
  }
  if (found.minSubtotal && ethCompare(subtotal, found.minSubtotal) < 0) {
    return { ok: false, error: { code: 'COUPON_MIN_NOT_MET', message: `Cupom válido para compras a partir de ${found.minSubtotal} ETH.` } }
  }
  const discount = found.type === 'percent' ? ethPercent(subtotal, found.value) : ethMin(found.value, subtotal)
  return { ok: true, coupon: { code: found.code, label: found.label, type: found.type, value: found.value }, discount }
}

const FEES: Record<NetworkId, { base: string; perUnit: string }> = {
  ethereum: { base: '0.003', perUnit: '0.0004' },
  polygon: { base: '0.0004', perUnit: '0.0001' },
  arbitrum: { base: '0.0008', perUnit: '0.0002' },
  base: { base: '0.0006', perUnit: '0.0002' },
}

export interface QuoteInput { nftId: string; editionId: string; quantity: number; cartItemId?: string | null }

export function buildQuote(inputs: QuoteInput[], couponCode: string | null, network: NetworkId): Quote {
  const d = getDb()
  const lines: QuoteLine[] = []
  for (const input of inputs) {
    const nft = d.nfts.find((n) => n.id === input.nftId)
    const edition = nft?.editions.find((e) => e.id === input.editionId)
    if (!nft || !edition) continue
    const status = edition.available === 0 ? 'sold_out' : input.quantity > Math.min(edition.available, MAX_QTY_PER_LINE) ? 'insufficient' : 'ok'
    lines.push({
      cartItemId: input.cartItemId ?? null,
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      editionName: edition.name,
      image: nft.images[0]!,
      quantity: input.quantity,
      unitPrice: edition.price,
      lineTotal: ethMulInt(edition.price, input.quantity),
      available: edition.available,
      status,
    })
  }
  const subtotal = lines.reduce((sum, l) => ethAdd(sum, l.lineTotal), '0')
  const units = lines.reduce((sum, l) => sum + l.quantity, 0)
  let discount = '0'
  let coupon: Quote['coupon'] = null
  let couponError: Quote['couponError'] = null
  if (couponCode && lines.length > 0) {
    const result = evaluateCoupon(couponCode, subtotal)
    if (result.ok) {
      coupon = result.coupon
      discount = result.discount
    } else {
      couponError = result.error
    }
  }
  const fee = FEES[network]
  const networkFee = units > 0 ? ethAdd(fee.base, ethMulInt(fee.perUnit, units)) : '0'
  const total = ethAdd(ethSub(subtotal, discount), networkFee)
  const canCheckout = lines.length > 0 && lines.every((l) => l.status === 'ok')
  const fingerprint = cyrb53(
    JSON.stringify({
      network,
      lines: [...lines]
        .sort((a, b) => `${a.nftId}/${a.editionId}`.localeCompare(`${b.nftId}/${b.editionId}`))
        .map((l) => [l.nftId, l.editionId, l.quantity, l.unitPrice, l.status]),
      subtotal,
      discount,
      networkFee,
      total,
      coupon: coupon?.code ?? null,
    }),
  )
  return {
    network,
    currency: 'ETH',
    lines,
    subtotal,
    discount,
    networkFee: ethIsZero(networkFee) ? '0' : networkFee,
    total,
    coupon,
    couponError,
    canCheckout,
    fingerprint,
    generatedAt: nowIso(),
  }
}
