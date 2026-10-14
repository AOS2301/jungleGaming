import type { QueryClient } from '@tanstack/react-query'
import type { Nft, NftListResponse, NftUpdatedEvent } from '@/api/contracts'
import { qk } from '@/api/queries'
import { formatEthWithUnit } from '@/lib/decimal'

/** Edição como era antes do evento (para comparar com o estado novo). */
export interface EditionBefore {
  id: string
  name: string
  price: string
  available: number
}

/** Aplica no NFT os preços/estoques do evento. */
export function applyNftEvent(nft: Nft, event: NftUpdatedEvent): Nft {
  const changes = new Map(event.data.editions.map((e) => [e.id, e]))
  return {
    ...nft,
    version: event.version,
    priceFrom: event.data.priceFrom,
    available: event.data.available,
    editions: nft.editions.map((edition) => {
      const change = changes.get(edition.id)
      return change ? { ...edition, price: change.price, available: change.available } : edition
    }),
  }
}

/** Todas as cópias do NFT que estão em cache (detalhe, listas e destaques). */
export function cachedCopiesOfNft(queryClient: QueryClient, nftId: string): Nft[] {
  const detail = queryClient.getQueryData<Nft>(qk.nft(nftId))
  const inLists = queryClient.getQueriesData<NftListResponse>({ queryKey: qk.nftLists }).flatMap(([, list]) => list?.items.filter((i) => i.id === nftId) ?? [])
  const inFeatured = (queryClient.getQueryData<Nft[]>(qk.nftFeatured) ?? []).filter((n) => n.id === nftId)
  return [detail, ...inLists, ...inFeatured].filter((n): n is Nft => !!n)
}

/** Atualiza todas as cópias em cache; só avança, nunca volta para uma versão mais antiga. */
export function patchCachedNft(queryClient: QueryClient, event: NftUpdatedEvent): void {
  const id = event.resource.id
  const patch = (nft: Nft) => (event.version > nft.version ? applyNftEvent(nft, event) : nft)

  queryClient.setQueryData<Nft>(qk.nft(id), (old) => old && patch(old))
  queryClient.setQueriesData<NftListResponse>({ queryKey: qk.nftLists }, (old) => old && { ...old, items: old.items.map((i) => (i.id === id ? patch(i) : i)) })
  queryClient.setQueryData<Nft[]>(qk.nftFeatured, (old) => old?.map((n) => (n.id === id ? patch(n) : n)))
}

/** Frases em português que descrevem o que mudou (preço e/ou disponibilidade). */
export function describeNftChange(nftName: string, before: EditionBefore[], event: NftUpdatedEvent): string[] {
  const messages: string[] = []
  for (const after of event.data.editions) {
    const old = before.find((e) => e.id === after.id)
    if (!old) continue
    const label = `"${nftName}" (${old.name})`

    if (old.price !== after.price) {
      messages.push(`O preço de ${label} mudou de ${formatEthWithUnit(old.price)} para ${formatEthWithUnit(after.price)}.`)
    }
    if (old.available !== after.available) {
      if (after.available === 0) messages.push(`A edição ${old.name} de "${nftName}" esgotou.`)
      else if (after.available < old.available) messages.push(`Restam ${after.available} unidade(s) de ${label}.`)
      else messages.push(`A disponibilidade de ${label} aumentou para ${after.available} unidade(s).`)
    }
  }
  return messages
}
