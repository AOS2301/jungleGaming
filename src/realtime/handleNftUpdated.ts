import { toast } from 'sonner'
import type { Cart, NftUpdatedEvent, Quote } from '@/api/contracts'
import { qk } from '@/api/queries'
import { cachedCopiesOfNft, describeNftChange, patchCachedNft, type EditionBefore } from './nft-changes'
import { announce, pushCartNotice } from './notices'
import type { EventOutcome, ProcessorContext } from './types'

/**
 * `nft.updated`: atualiza preço/estoque no catálogo e no detalhe, e, se o NFT está no carrinho,
 * refaz carrinho e cotação pela REST (a API é a referência) e avisa o usuário.
 *
 * `latestVersions` guarda a maior versão já vista de cada NFT (mesmo quando ele não está em cache).
 */
export function handleNftUpdated(event: NftUpdatedEvent, ctx: ProcessorContext, latestVersions: Map<string, number>): EventOutcome {
  const { queryClient } = ctx
  const nftId = event.resource.id
  const scope = ctx.userId ?? 'guest'
  const copies = cachedCopiesOfNft(queryClient, nftId)

  // Evento antigo ou repetido? Compara com o que já vimos e com o que a REST já entregou.
  const knownVersion = Math.max(latestVersions.get(nftId) ?? -1, ...copies.map((n) => n.version))
  if (event.version <= knownVersion) return 'stale'
  latestVersions.set(nftId, event.version)

  // O que o carrinho/cotação sabem deste NFT (antes de atualizar).
  const cartLines = queryClient.getQueryData<Cart>(qk.cart(scope))?.items.filter((i) => i.nftId === nftId) ?? []
  const quoteLines = queryClient.getQueriesData<Quote>({ queryKey: qk.quotes(scope) }).flatMap(([, q]) => q?.lines.filter((l) => l.nftId === nftId) ?? [])
  // Se carrinho/cotação ainda estão carregando, a resposta em andamento pode ser anterior ao evento.
  const cartIsLoading = queryClient.isFetching({ queryKey: qk.cart(scope) }) + queryClient.isFetching({ queryKey: qk.quotes(scope) }) > 0
  const affectsCart = cartLines.length > 0 || quoteLines.length > 0 || cartIsLoading

  const editionsBefore: EditionBefore[] = copies[0]
    ? copies[0].editions.map((e) => ({ id: e.id, name: e.name, price: e.price, available: e.available }))
    : cartLines.map((l) => ({ id: l.editionId, name: l.editionName, price: l.unitPrice, available: l.available }))
  const nftName = copies[0]?.name ?? cartLines[0]?.name ?? nftId

  patchCachedNft(queryClient, event)
  if (affectsCart) {
    void queryClient.invalidateQueries({ queryKey: qk.cart(scope) })
    void queryClient.invalidateQueries({ queryKey: qk.quotes(scope) })
  }

  // Avisos ao usuário (só quando o NFT está no carrinho ou na tela de detalhe aberta).
  const messages = describeNftChange(nftName, editionsBefore, event)
  const inCart = cartLines.length > 0
  if (inCart) messages.forEach((message, i) => pushCartNotice({ id: `${event.id}:${i}`, nftId, message }))
  if ((inCart || ctx.viewingNftId() === nftId) && messages.length > 0) {
    announce(messages.join(' '))
    toast.info('Atualização em tempo real', { description: messages.join(' '), id: `nft-${nftId}` })
  }
  return 'applied'
}
