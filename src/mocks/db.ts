/**
 * Banco de dados simulado (em memória + persistência em localStorage).
 *
 * É a única fonte de estado do "servidor": catálogo, usuários, sessões, carrinhos,
 * favoritos, carteiras, pedidos e chaves de idempotência. Toda mutação que afeta
 * NFTs ou pedidos publica um evento no `bus` — por isso REST e Socket.IO são coerentes.
 */
import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, Wallet } from '@/api/contracts'
import { ethAdd, ethCompare, ethMulInt } from '@/lib/decimal'
import { bus } from './bus'
import { seedCatalog, seedFavorites, seedUsers, seedWallets, type SeedUser } from './fixtures'

export const DB_KEY = 'jg.mock.db'
const SCHEMA = 5

export type DbUser = SeedUser
export interface DbSession { token: string; userId: string; expiresAt: number; createdAt: number }
export interface DbCartItem { id: string; nftId: string; editionId: string; quantity: number }
export interface DbCart {
  id: string
  /** user:<id> ou guest:<token> */
  owner: string
  items: DbCartItem[]
  couponCode: string | null
  version: number
  updatedAt: string
}
export interface DbWallet extends Omit<Wallet, 'connection'> { userId: string; connection: Wallet['connection'] }
export interface DbOrder extends Order { userId: string; resolveAt: number; idempotencyKey: string | null }
export interface DbIdempotency { userId: string; key: string; payloadHash: string; orderId: string }

export interface Db {
  schema: number
  users: DbUser[]
  sessions: DbSession[]
  nfts: Nft[]
  carts: DbCart[]
  favorites: Record<string, string[]>
  wallets: DbWallet[]
  orders: DbOrder[]
  idempotency: DbIdempotency[]
  /** Contadores de falhas injetadas (por Fault.id). */
  faults: Record<string, number>
  /** Métricas do servidor simulado (ex.: requisições de pedido, replays de idempotência) — úteis em testes. */
  metrics: Record<string, number>
  seq: { event: number; id: number }
}

let db: Db | null = null

export const nowIso = () => new Date(Date.now()).toISOString()

/** Recalcula os campos derivados do NFT (priceFrom e available). */
export function recomputeNft(nft: Nft): Nft {
  const availableEditions = nft.editions.filter((e) => e.available > 0)
  const pool = availableEditions.length > 0 ? availableEditions : nft.editions
  nft.priceFrom = pool.reduce((min, e) => (ethCompare(e.price, min) < 0 ? e.price : min), pool[0]!.price)
  nft.available = nft.editions.reduce((sum, e) => sum + e.available, 0)
  return nft
}

function seedNfts(): Nft[] {
  const creators = new Map(seedCatalog.creators.map((c) => [c.id, c]))
  const collections = new Map(seedCatalog.collections.map((c) => [c.id, c]))
  return seedCatalog.nfts.map((n) =>
    recomputeNft({
      id: n.id,
      name: n.name,
      description: n.description,
      category: n.category,
      network: n.network,
      collection: { id: n.collectionId, name: collections.get(n.collectionId)!.name },
      creator: creators.get(n.creatorId)!,
      images: n.images,
      traits: n.traits,
      editions: n.editions.map((e) => ({ ...e })),
      priceFrom: '0',
      available: 0,
      featured: n.featured,
      popularity: n.popularity,
      createdAt: n.createdAt,
      version: 1,
    }),
  )
}

function seedOrder(id: string, userId: string, walletId: string, nftId: string, editionId: string, qty: number, hash: string): DbOrder {
  const nft = seedCatalog.nfts.find((n) => n.id === nftId)!
  const edition = nft.editions.find((e) => e.id === editionId)!
  const user = seedUsers.find((u) => u.id === userId)!
  const wallet = seedWallets.find((w) => w.id === walletId)!
  const unit = edition.price
  const lineTotal = ethMulInt(unit, qty)
  const fee = '0.0034'
  const total = ethAdd(lineTotal, fee)
  return {
    id,
    userId,
    status: 'confirmed',
    version: 2,
    createdAt: '2026-03-01T14:00:00.000Z',
    updatedAt: '2026-03-01T14:00:05.000Z',
    network: wallet.preferredNetwork,
    items: [{ nftId, editionId, name: nft.name, editionName: edition.name, image: nft.images[0]!, quantity: qty, unitPrice: unit, lineTotal }],
    subtotal: lineTotal,
    discount: '0',
    networkFee: fee,
    total,
    couponCode: null,
    wallet: { id: wallet.id, label: wallet.label, provider: wallet.provider, addressMasked: maskAddress(wallet.address) },
    collector: { fullName: user.displayName, email: user.email, country: user.country, document: '000.000.000-00' },
    tx: { hash, explorerUrl: `https://explorer.mock/tx/${hash}`, blockNumber: 19_000_000, confirmedAt: '2026-03-01T14:00:05.000Z' },
    decline: null,
    resolveAt: 0,
    idempotencyKey: null,
  }
}

export const maskAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

export function buildSeed(): Db {
  return {
    schema: SCHEMA,
    users: seedUsers.map((u) => ({ ...u })),
    sessions: [],
    nfts: seedNfts(),
    carts: [],
    favorites: JSON.parse(JSON.stringify(seedFavorites)),
    wallets: seedWallets.map((w) => ({ ...w, connection: null })),
    orders: [
      seedOrder('ord_seed_ana', 'usr_ana', 'wal_ana_1', 'nft-001', 'standard', 1, '0x' + 'a1'.repeat(32)),
      seedOrder('ord_seed_bruno', 'usr_bruno', 'wal_bruno_1', 'nft-006', 'standard', 1, '0x' + 'b2'.repeat(32)),
    ],
    idempotency: [],
    faults: {},
    metrics: {},
    seq: { event: 1, id: 1 },
  }
}

export function getDb(): Db {
  if (db) return db
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.schema === SCHEMA) {
        db = parsed
        return db
      }
    }
  } catch {
    /* DB corrompido: recria a partir da semente */
  }
  db = buildSeed()
  commit()
  return db
}

export function bumpMetric(name: string): void {
  const d = getDb()
  d.metrics[name] = (d.metrics[name] ?? 0) + 1
  commit()
}

export function commit(): void {
  if (!db) return
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* quota/indisponível: o estado continua em memória */
  }
}

/** Restaura integralmente o cenário conhecido (semente). */
export function resetDb(): Db {
  db = buildSeed()
  commit()
  return db
}

/** Descarta o cache em memória para reler o localStorage (mudança feita em outra aba). */
export function invalidateMemory(): void {
  db = null
}

export function nextId(prefix: string): string {
  const d = getDb()
  const id = `${prefix}_${String(d.seq.id++).padStart(5, '0')}`
  return id
}

function nextEventId(): string {
  const d = getDb()
  return `evt_${String(d.seq.event++).padStart(6, '0')}`
}

// ---------- publicação de eventos ----------
export function nftEvent(nft: Nft): NftUpdatedEvent {
  return {
    id: nextEventId(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: nowIso(),
    data: {
      editions: nft.editions.map((e) => ({ id: e.id, price: e.price, available: e.available })),
      priceFrom: nft.priceFrom,
      available: nft.available,
    },
  }
}

export function orderEvent(order: DbOrder): OrderUpdatedEvent {
  const { userId, resolveAt: _r, idempotencyKey: _k, ...publicOrder } = order
  void _r
  void _k
  return {
    id: nextEventId(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: nowIso(),
    userId,
    data: { status: order.status, order: publicOrder },
  }
}

export interface EditionPatch { price?: string; available?: number }

/** Altera preço/estoque de edições, incrementa a versão e emite `nft.updated`. */
export function updateNftEditions(nftId: string, patches: Record<string, EditionPatch>): { nft: Nft; event: NftUpdatedEvent } | null {
  const d = getDb()
  const nft = d.nfts.find((n) => n.id === nftId)
  if (!nft) return null
  for (const edition of nft.editions) {
    const patch = patches[edition.id]
    if (!patch) continue
    if (patch.price !== undefined) edition.price = patch.price
    if (patch.available !== undefined) edition.available = Math.max(0, Math.min(edition.total, patch.available))
  }
  nft.version += 1
  recomputeNft(nft)
  const event = nftEvent(nft)
  commit()
  bus.publish(event, { all: true })
  return { nft, event }
}

export function publishOrder(order: DbOrder): OrderUpdatedEvent {
  const event = orderEvent(order)
  commit()
  bus.publish(event, { userId: order.userId })
  return event
}

export function toPublicOrder(order: DbOrder): Order {
  const { userId: _u, resolveAt: _r, idempotencyKey: _k, ...rest } = order
  void _u
  void _r
  void _k
  return rest
}

export function cartOwner(userId: string | null, guestToken: string | null): string | null {
  if (userId) return `user:${userId}`
  if (guestToken) return `guest:${guestToken}`
  return null
}

export function findOrCreateCart(owner: string): DbCart {
  const d = getDb()
  let cart = d.carts.find((c) => c.owner === owner)
  if (!cart) {
    cart = { id: nextId('cart'), owner, items: [], couponCode: null, version: 1, updatedAt: nowIso() }
    d.carts.push(cart)
  }
  return cart
}
