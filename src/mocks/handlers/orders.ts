import { http } from 'msw'
import { createOrderSchema, type Order, type CreateOrderRequest } from '@/api/contracts'
import {
  commit, getDb, maskAddress, nextId, nowIso, publishOrder, toPublicOrder, updateNftEditions, type DbOrder,
} from '../db'
import { buildQuote, maxQuantityFor, touchCart } from '../domain'
import { getScenario } from '../scenarios'
import { apiError, authenticate, consumeOnce, cyrb53, json, notFound, parseBody, resolver } from '../http'

const MANUAL = Number.MAX_SAFE_INTEGER

function txHash(seed: string): string {
  let out = ''
  for (let i = 0; out.length < 64; i++) out += cyrb53(`${seed}:${i}`)
  return `0x${out.slice(0, 64)}`
}

const canonicalPayload = (b: CreateOrderRequest) =>
  JSON.stringify({
    items: [...b.items].sort((x, y) => `${x.nftId}/${x.editionId}`.localeCompare(`${y.nftId}/${y.editionId}`)),
    couponCode: b.couponCode,
    network: b.network,
    walletId: b.walletId,
    collector: b.collector,
    quoteFingerprint: b.quoteFingerprint,
  })

// ---------- resolução (pendente -> confirmado | recusado) ----------
const timers = new Map<string, ReturnType<typeof setTimeout>>()

/** Resolve um pedido pendente. Idempotente: estados terminais nunca mudam. */
export function resolveOrder(orderId: string, forced?: 'confirmed' | 'declined'): DbOrder | null {
  const d = getDb()
  const order = d.orders.find((o) => o.id === orderId)
  if (!order) return null
  if (order.status !== 'pending') return order
  clearTimeout(timers.get(orderId))
  timers.delete(orderId)

  let outcome: 'confirmed' | 'declined' = forced ?? (getScenario().payment === 'declined' ? 'declined' : 'confirmed')
  let decline: Order['decline'] = null
  if (outcome === 'confirmed') {
    const stockOk = order.items.every((i) => {
      const edition = d.nfts.find((n) => n.id === i.nftId)?.editions.find((e) => e.id === i.editionId)
      return !!edition && edition.available >= i.quantity
    })
    if (!stockOk) {
      outcome = 'declined'
      decline = { code: 'SOLD_OUT', message: 'Uma das edições esgotou antes da confirmação. Nenhum valor foi cobrado.' }
    }
  } else {
    decline = { code: 'PAYMENT_DECLINED', message: 'A carteira recusou a assinatura da transação. Nenhum valor foi cobrado.' }
  }

  if (outcome === 'confirmed') {
    // baixa de estoque (emite nft.updated por NFT afetado)
    const byNft = new Map<string, Record<string, { available: number }>>()
    for (const i of order.items) {
      const nft = d.nfts.find((n) => n.id === i.nftId)!
      const edition = nft.editions.find((e) => e.id === i.editionId)!
      const patch = byNft.get(i.nftId) ?? {}
      patch[i.editionId] = { available: (patch[i.editionId]?.available ?? edition.available) - i.quantity }
      byNft.set(i.nftId, patch)
    }
    for (const [nftId, patch] of byNft) updateNftEditions(nftId, patch)
    // remove do carrinho apenas o que foi comprado
    const cart = d.carts.find((c) => c.owner === `user:${order.userId}`)
    if (cart) {
      for (const bought of order.items) {
        const line = cart.items.find((l) => l.nftId === bought.nftId && l.editionId === bought.editionId)
        if (line) line.quantity -= bought.quantity
      }
      cart.items = cart.items.filter((l) => l.quantity > 0)
      if (cart.items.length === 0) cart.couponCode = null
      touchCart(cart)
    }
    order.tx = {
      hash: txHash(order.id),
      explorerUrl: `https://explorer.mock/tx/${txHash(order.id)}`,
      blockNumber: 19_000_000 + order.version * 17 + d.orders.length,
      confirmedAt: nowIso(),
    }
  }
  order.status = outcome
  order.decline = outcome === 'declined' ? decline : null
  order.version += 1
  order.updatedAt = nowIso()
  publishOrder(order)
  return order
}

function scheduleResolution(order: DbOrder): void {
  if (order.status !== 'pending' || order.resolveAt === MANUAL) return
  clearTimeout(timers.get(order.id))
  timers.set(order.id, setTimeout(() => resolveOrder(order.id), Math.max(0, order.resolveAt - Date.now())))
}

/** Reagenda a resolução dos pedidos pendentes (após refresh da página). */
export function bootstrapOrders(): void {
  for (const order of getDb().orders) scheduleResolution(order)
}

/** Resolução "preguiçosa": se o horário de resolução já passou (ex.: timer perdido num refresh), resolve ao consultar. */
function resolveIfDue(order: DbOrder): void {
  if (order.status === 'pending' && order.resolveAt !== MANUAL && order.resolveAt <= Date.now()) resolveOrder(order.id)
}

export const orderHandlers = [
  http.post(
    '*/api/orders',
    resolver(async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const key = request.headers.get('idempotency-key')
      if (!key) return apiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'O cabeçalho Idempotency-Key é obrigatório.')
      const parsed = await parseBody(request, createOrderSchema)
      if ('response' in parsed) return parsed.response
      const body = parsed.data
      const d = getDb()
      const payloadHash = cyrb53(canonicalPayload(body))

      // idempotência: mesma chave + mesmo conteúdo => mesmo pedido; conteúdo diferente => conflito
      const prior = d.idempotency.find((i) => i.userId === auth.user.id && i.key === key)
      if (prior) {
        if (prior.payloadHash !== payloadHash) {
          return apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Esta chave de idempotência já foi usada com outro conteúdo.')
        }
        const existing = d.orders.find((o) => o.id === prior.orderId)!
        resolveIfDue(existing)
        return json(toPublicOrder(existing), 200, { 'Idempotent-Replayed': 'true' })
      }

      const wallet = d.wallets.find((w) => w.id === body.walletId)
      if (!wallet) return notFound('Carteira')
      if (wallet.userId !== auth.user.id) return apiError(403, 'FORBIDDEN', 'Esta carteira pertence a outro usuário.')
      if (!wallet.connection || wallet.connection.network !== body.network) {
        return apiError(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira na rede selecionada para continuar.')
      }

      // falha injetada uma única vez (persistida): altera o catálogo e emite nft.updated
      const conflict = getScenario().submitConflict
      if (conflict !== 'none' && consumeOnce('submit-conflict')) {
        const first = body.items[0]!
        const nft = d.nfts.find((n) => n.id === first.nftId)
        const edition = nft?.editions.find((e) => e.id === first.editionId)
        if (nft && edition) {
          updateNftEditions(nft.id, {
            [edition.id]: conflict === 'price-change' ? { price: bump(edition.price) } : { available: 0 },
          })
        }
      }

      const quote = buildQuote(body.items, body.couponCode, body.network)
      if (quote.lines.length !== body.items.length) return notFound('NFT ou edição')
      const bad = quote.lines.filter((l) => l.status !== 'ok')
      if (bad.length > 0) {
        return apiError(409, 'AVAILABILITY_CONFLICT', 'Alguns itens não estão mais disponíveis na quantidade escolhida.', {
          details: { lines: bad.map((l) => ({ nftId: l.nftId, editionId: l.editionId, available: l.available, max: maxQuantityFor(l.available) })), quote },
        })
      }
      if (quote.fingerprint !== body.quoteFingerprint) {
        return apiError(409, 'QUOTE_CHANGED', 'Os valores do pedido mudaram. Revise a nova cotação.', { details: { quote } })
      }

      const scenario = getScenario()
      const now = nowIso()
      const order: DbOrder = {
        id: nextId('ord'),
        userId: auth.user.id,
        status: 'pending',
        version: 1,
        createdAt: now,
        updatedAt: now,
        network: body.network,
        items: quote.lines.map((l) => ({
          nftId: l.nftId, editionId: l.editionId, name: l.name, editionName: l.editionName, image: l.image,
          quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal,
        })),
        subtotal: quote.subtotal,
        discount: quote.discount,
        networkFee: quote.networkFee,
        total: quote.total,
        couponCode: quote.coupon?.code ?? null,
        wallet: { id: wallet.id, label: wallet.label, provider: wallet.provider, addressMasked: maskAddress(wallet.address) },
        collector: body.collector,
        tx: null,
        decline: null,
        resolveAt: scenario.orders.resolution === 'manual' ? MANUAL : Date.now() + scenario.orders.delayMs,
        idempotencyKey: key,
      }
      d.orders.push(order)
      d.idempotency.push({ userId: auth.user.id, key, payloadHash, orderId: order.id })
      commit()
      publishOrder(order)
      scheduleResolution(order)
      return json(toPublicOrder(order), 201)
    }),
  ),

  http.get(
    '*/api/orders',
    resolver(({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const status = new URL(request.url).searchParams.get('status')
      const items = getDb()
        .orders.filter((o) => o.userId === auth.user.id)
        .map((o) => {
          resolveIfDue(o)
          return o
        })
        .filter((o) => !status || o.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toPublicOrder)
      return json({ items })
    }),
  ),

  http.get(
    '*/api/orders/:id',
    resolver(({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const order = getDb().orders.find((o) => o.id === params.id)
      if (!order) return notFound('Pedido')
      if (order.userId !== auth.user.id) return apiError(403, 'FORBIDDEN', 'Você não tem permissão para ver este pedido.')
      resolveIfDue(order)
      return json(toPublicOrder(order))
    }),
  ),
]

/** +10% no preço (exato, em decimal) — usado na falha "preço alterado durante a compra". */
function bump(price: string): string {
  const [w = '0', f = ''] = price.split('.')
  const scaled = BigInt(w + f.padEnd(6, '0').slice(0, 6))
  const next = (scaled * 110n) / 100n
  const s = next.toString().padStart(7, '0')
  const out = `${s.slice(0, -6)}.${s.slice(-6)}`.replace(/0+$/, '').replace(/\.$/, '')
  return out
}
