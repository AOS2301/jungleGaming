import { ShoppingBag, Zap } from 'lucide-react'
import type { Nft } from '@/api/contracts'
import { Eth } from '@/components/common/Eth'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { ethMulInt } from '@/lib/decimal'
import { EditionPicker } from './EditionPicker'
import { usePurchase } from './usePurchase'

/** Bloco de compra: edição, preço, quantidade e botões. */
export function PurchasePanel({ nft }: { nft: Nft }) {
  const { isAuthenticated } = useSession()
  const purchase = usePurchase(nft)
  const { edition, soldOut, canBuy } = purchase
  const anotherEditionAvailable = nft.editions.some((e) => e.available > 0)

  return (
    <div className="flex flex-col gap-6">
      <EditionPicker editions={nft.editions} selectedId={edition.id} onSelect={purchase.selectEdition} />

      {soldOut && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm" data-testid="edition-unavailable">
          A edição <strong>{edition.name}</strong> está esgotada.{' '}
          {anotherEditionAvailable ? 'Escolha outra edição para comprar.' : 'Este NFT não tem unidades disponíveis no momento.'}
        </p>
      )}

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Preço da edição {edition.name}</p>
            <p key={edition.price} className="animate-fade-in text-3xl font-bold" data-testid="detail-price">
              <Eth value={edition.price} unitClassName="text-base" />
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qty" className="text-sm font-semibold">Quantidade</label>
            <QuantityStepper id="qty" value={purchase.quantity} onChange={purchase.setQuantity} max={Math.max(1, purchase.remaining)} disabled={!canBuy} />
          </div>
        </div>

        <p className="mt-3 text-[13px] text-muted" data-testid="qty-hint" aria-live="polite">{quantityHint(purchase)}</p>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted">Total ({purchase.quantity} un.)</span>
          <Eth value={ethMulInt(edition.price, purchase.quantity)} className="text-lg font-bold" />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="flex-1" disabled={!canBuy} loading={purchase.isAdding} onClick={() => purchase.addAndGo('/cart')}>
            <ShoppingBag aria-hidden /> {soldOut ? 'Esgotado' : 'Adicionar ao carrinho'}
          </Button>
          <Button size="lg" variant="outline" className="flex-1" disabled={!canBuy} loading={purchase.isAdding} onClick={() => purchase.addAndGo('/checkout')}>
            <Zap aria-hidden /> {isAuthenticated ? 'Comprar agora' : 'Entrar e comprar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Texto de ajuda sob a quantidade: explica o limite atual. */
function quantityHint({ soldOut, remaining, inCart, limit, edition }: ReturnType<typeof usePurchase>): string {
  if (soldOut) return 'Sem unidades disponíveis nesta edição.'
  if (remaining === 0) return `Você já tem o máximo disponível (${inCart}) no carrinho.`

  const parts = [`Máximo de ${limit} por compra`]
  if (edition.available <= limit) parts.push(`${edition.available} ${edition.available === 1 ? 'disponível' : 'disponíveis'}`)
  if (inCart > 0) parts.push(`${inCart} já no carrinho`)
  return `${parts.join(' · ')}.`
}
