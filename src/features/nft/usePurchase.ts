import { getRouteApi, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Nft } from '@/api/contracts'
import { useAddToCart, useCart } from '@/features/cart/hooks'
import { MAX_QTY_PER_LINE } from '@/lib/catalog'

const route = getRouteApi('/nfts/$nftId')

/**
 * Estado da compra na página de detalhe: edição escolhida (guardada na URL, ?edition=),
 * quantidade e os limites (estoque, máximo por compra e o que já está no carrinho).
 */
export function usePurchase(nft: Nft) {
  const requestedEditionId = route.useSearch().edition
  const navigate = route.useNavigate()
  const router = useRouter()
  const cart = useCart()
  const addToCart = useAddToCart()
  const [wantedQuantity, setWantedQuantity] = useState(1)

  // Edição da URL; se não houver, a primeira com estoque.
  const edition = nft.editions.find((e) => e.id === requestedEditionId) ?? nft.editions.find((e) => e.available > 0) ?? nft.editions[0]!
  const soldOut = edition.available === 0

  const inCart = cart.data?.items.find((i) => i.nftId === nft.id && i.editionId === edition.id)?.quantity ?? 0
  const limit = Math.min(edition.available, MAX_QTY_PER_LINE)
  const remaining = Math.max(0, limit - inCart) // quantas unidades ainda podem ser adicionadas
  const quantity = Math.min(wantedQuantity, Math.max(1, remaining))

  // O estoque caiu em tempo real: mantém a quantidade escolhida dentro do novo limite.
  useEffect(() => {
    if (remaining > 0 && wantedQuantity > remaining) setWantedQuantity(remaining)
  }, [remaining, wantedQuantity])

  const selectEdition = (editionId: string) => void navigate({ search: { edition: editionId }, replace: true, resetScroll: false })

  /** Adiciona ao carrinho e vai para o carrinho (ou direto para o checkout). */
  const addAndGo = (destination: '/cart' | '/checkout') =>
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity, name: nft.name },
      { onSuccess: () => void router.navigate({ to: destination }) },
    )

  return {
    edition,
    selectEdition,
    quantity,
    setQuantity: setWantedQuantity,
    soldOut,
    inCart,
    limit,
    remaining,
    canBuy: !soldOut && remaining > 0,
    addAndGo,
    isAdding: addToCart.isPending,
  }
}
