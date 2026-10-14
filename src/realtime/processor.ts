/**
 * Processamento de eventos Socket.IO → cache do TanStack Query.
 *
 * Garantias:
 *  - payload validado com zod (inválido é descartado);
 *  - deduplicação por `event.id` (reentregas não reaplicam efeitos);
 *  - versão: evento com `version` menor ou igual à conhecida é descartado (nunca regride estado);
 *  - isolamento: `order.updated` de outro usuário é ignorado;
 *  - estados terminais de pedido (confirmed/declined) nunca regridem;
 *  - os efeitos colaterais (toast, aviso no carrinho, invalidação) ocorrem só quando o evento é aplicado.
 */
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  nftUpdatedEventSchema, orderUpdatedEventSchema, REALTIME_EVENTS,
  type Cart, type Nft, type NftListResponse, type NftUpdatedEvent, type Order, type OrderUpdatedEvent, type Quote,
} from '@/api/contracts'
import { qk } from '@/api/queries'
import { formatEthWithUnit } from '@/lib/decimal'
import { announce, pushCartNotice } from './notices'

export type EventOutcome = 'applied' | 'duplicate' | 'stale' | 'ignored-user' | 'invalid'

export interface ProcessorContext {
  queryClient: QueryClient
  /** Usuário da sessão a que este processador pertence (null = visitante). */
  userId: string | null
  /** Abre um caminho da app (ação do toast). */
  navigate: (to: string) => void
  /** NFT visualizado no momento (rota de detalhe), se houver. */
  viewingNftId: () => string | null
}

const SEEN_LIMIT = 500
const isTerminal = (s: Order['status']) => s === 'confirmed' || s === 'declined'

function mergeNft(nft: Nft, event: NftUpdatedEvent): Nft {
  const patches = new Map(event.data.editions.map((e) => [e.id, e]))
  return {
    ...nft,
    version: event.version,
    priceFrom: event.data.priceFrom,
    available: event.data.available,
    editions: nft.editions.map((e) => {
      const p = patches.get(e.id)
      return p ? { ...e, price: p.price, available: p.available } : e
    }),
  }
}

function describeChange(name: string, before: { id: string; name: string; price: string; available: number }[], event: NftUpdatedEvent): string[] {
  const messages: string[] = []
  for (const after of event.data.editions) {
    const prev = before.find((e) => e.id === after.id)
    if (!prev) continue
    const label = `"${name}" (${prev.name})`
    if (prev.price !== after.price) messages.push(`O preço de ${label} mudou de ${formatEthWithUnit(prev.price)} para ${formatEthWithUnit(after.price)}.`)
    if (prev.available !== after.available) {
      messages.push(
        after.available === 0
          ? `A edição ${prev.name} de "${name}" esgotou.`
          : after.available < prev.available
            ? `Restam ${after.available} unidade(s) de ${label}.`
            : `A disponibilidade de ${label} aumentou para ${after.available} unidade(s).`,
      )
    }
  }
  return messages
}

export function createEventProcessor(ctx: ProcessorContext) {
  const { queryClient: qc } = ctx
  const scope = ctx.userId ?? 'guest'
  const seen = new Set<string>()
  const latestNftVersion = new Map<string, number>()

  const remember = (id: string) => {
    seen.add(id)
    if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value as string)
  }

  function handleNft(event: NftUpdatedEvent): EventOutcome {
    const id = event.resource.id
    const known = latestNftVersion.get(id) ?? -1
    // versão efetivamente conhecida pelo cache (REST pode ter entregue algo mais novo)
    const cachedDetail = qc.getQueryData<Nft>(qk.nft(id))
    const cachedList = qc.getQueriesData<NftListResponse>({ queryKey: qk.nftLists }).flatMap(([, d]) => d?.items.filter((i) => i.id === id) ?? [])
    const cachedFeatured = (qc.getQueryData<Nft[]>(qk.nftFeatured) ?? []).filter((n) => n.id === id)
    const copies = [cachedDetail, ...cachedList, ...cachedFeatured].filter((n): n is Nft => !!n)
    const knownVersion = Math.max(known, ...copies.map((n) => n.version))
    if (event.version <= knownVersion) return 'stale'
    latestNftVersion.set(id, event.version)
    remember(event.id)

    const cart = qc.getQueryData<Cart>(qk.cart(scope))
    const cartLines = cart?.items.filter((i) => i.nftId === id) ?? []
    const quoteLines = qc.getQueriesData<Quote>({ queryKey: qk.quotes(scope) }).flatMap(([, q]) => q?.lines.filter((l) => l.nftId === id) ?? [])
    // se o carrinho/cotação ainda estão carregando, a resposta em voo pode ser anterior a este evento: revalida
    const inFlight = qc.isFetching({ queryKey: qk.cart(scope) }) + qc.isFetching({ queryKey: qk.quotes(scope) }) > 0
    const affectsCart = cartLines.length > 0 || quoteLines.length > 0 || inFlight
    const before =
      copies[0]?.editions.map((e) => ({ id: e.id, name: e.name, price: e.price, available: e.available })) ??
      cartLines.map((l) => ({ id: l.editionId, name: l.editionName, price: l.unitPrice, available: l.available }))
    const name = copies[0]?.name ?? cartLines[0]?.name ?? id

    const patch = (n: Nft) => (event.version > n.version ? mergeNft(n, event) : n)
    qc.setQueryData<Nft>(qk.nft(id), (old) => (old ? patch(old) : old))
    qc.setQueriesData<NftListResponse>({ queryKey: qk.nftLists }, (old) => (old ? { ...old, items: old.items.map((i) => (i.id === id ? patch(i) : i)) } : old))
    qc.setQueryData<Nft[]>(qk.nftFeatured, (old) => old?.map((n) => (n.id === id ? patch(n) : n)))

    const messages = describeChange(name, before, event)
    if (affectsCart) {
      // a REST é a referência: refaz carrinho e cotação, que atualiza o resumo
      void qc.invalidateQueries({ queryKey: qk.cart(scope) })
      void qc.invalidateQueries({ queryKey: qk.quotes(scope) })
    }
    if (cartLines.length > 0) {
      for (const [i, message] of messages.entries()) pushCartNotice({ id: `${event.id}:${i}`, nftId: id, message })
    }
    const relevant = cartLines.length > 0 || ctx.viewingNftId() === id
    if (relevant && messages.length > 0) {
      announce(messages.join(' '))
      toast.info('Atualização em tempo real', { description: messages.join(' '), id: `nft-${id}` })
    }
    return 'applied'
  }

  function handleOrder(event: OrderUpdatedEvent): EventOutcome {
    if (ctx.userId === null || event.userId !== ctx.userId) return 'ignored-user'
    const id = event.resource.id
    const key = qk.order(scope, id)
    const cached = qc.getQueryData<Order>(key)
    if (cached) {
      if (event.version <= cached.version) return 'stale'
      if (isTerminal(cached.status) && cached.status !== event.data.status) return 'stale'
    }
    remember(event.id)
    const order = event.data.order
    qc.setQueryData(key, order)
    void qc.invalidateQueries({ queryKey: qk.pendingOrders(scope) })
    if (isTerminal(order.status)) {
      void qc.invalidateQueries({ queryKey: qk.cart(scope) })
      void qc.invalidateQueries({ queryKey: qk.quotes(scope) })
      if (!cached || cached.status === 'pending') {
        const confirmed = order.status === 'confirmed'
        const text = confirmed ? 'Pedido confirmado! Sua compra foi concluída.' : 'Pagamento recusado. Seus itens continuam no carrinho.'
        announce(text)
        if (window.location.pathname !== `/orders/${id}`) {
          toast[confirmed ? 'success' : 'error'](text, { id: `order-${id}`, action: { label: confirmed ? 'Ver recibo' : 'Ver detalhes', onClick: () => ctx.navigate(`/orders/${id}`) } })
        }
      }
    }
    return 'applied'
  }

  return {
    handle(eventName: string, raw: unknown): EventOutcome {
      const schema = eventName === REALTIME_EVENTS.nftUpdated ? nftUpdatedEventSchema : eventName === REALTIME_EVENTS.orderUpdated ? orderUpdatedEventSchema : null
      const parsed = schema?.safeParse(raw)
      if (!parsed?.success) return 'invalid'
      const event = parsed.data
      if (seen.has(event.id)) return 'duplicate'
      return event.type === 'nft.updated' ? handleNft(event) : handleOrder(event)
    },
  }
}

export type EventProcessor = ReturnType<typeof createEventProcessor>
