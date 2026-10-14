import { Link } from '@tanstack/react-router'
import { ShoppingBag } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { CartLine, CartLineSkeleton } from './CartLine'
import { CartNotices } from './CartNotices'
import { CouponBox } from './CouponBox'
import { useCart, useQuote } from './hooks'
import { QuoteIssues, QuoteRows, QuoteSkeleton, SummaryCard } from './QuoteSummary'

export function CartPage() {
  useDocumentTitle('Carrinho')
  const cart = useCart()
  const quote = useQuote()
  const items = cart.data?.items ?? []
  const lineByItem = new Map(quote.data?.lines.map((l) => [l.cartItemId, l]))

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Carrinho</h1>
      <CartNotices />
      {cart.isError && !cart.data ? (
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} retrying={cart.isFetching} title="Não foi possível carregar o carrinho" />
      ) : cart.isPending ? (
        <div className="grid gap-8 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_400px]" data-testid="cart-skeleton">
          <ul className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando carrinho">{[0, 1].map((i) => <CartLineSkeleton key={i} />)}</ul>
          <div className="rounded-lg border border-border bg-surface p-6"><Skeleton className="mb-5 h-7 w-40" /><QuoteSkeleton /></div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Seu carrinho está vazio" description="Explore o catálogo e adicione NFTs para continuar.">
          <Button asChild><Link to="/">Explorar catálogo</Link></Button>
        </EmptyState>
      ) : (
        <div className="grid items-start gap-8 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_400px]">
          <ul className="flex flex-col gap-4" aria-label="Itens do carrinho">
            {items.map((item) => (
              <CartLine key={item.id} item={item} line={lineByItem.get(item.id)} />
            ))}
          </ul>
          <div className="lg:sticky lg:top-24">
            <SummaryCard>
              <div className="mb-6"><CouponBox couponCode={cart.data!.couponCode} disabled={false} /></div>
              {quote.data?.couponError && (
                <p role="alert" className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm" data-testid="coupon-error">
                  O cupom {cart.data!.couponCode} não é mais válido: {quote.data.couponError.message}
                </p>
              )}
              {quote.isPending ? (
                <QuoteSkeleton />
              ) : quote.isError && !quote.data ? (
                <ErrorState error={quote.error} onRetry={() => void quote.refetch()} retrying={quote.isFetching} className="px-2 py-6" title="Falha ao calcular" />
              ) : (
                <>
                  <QuoteRows quote={quote.data!} dim={quote.isFetching} />
                  <QuoteIssues quote={quote.data!} />
                </>
              )}
              <Button asChild size="lg" className="mt-6 w-full" aria-disabled={!quote.data?.canCheckout || undefined}>
                <Link to="/checkout" onClick={(e) => { if (!quote.data?.canCheckout) e.preventDefault() }}>Finalizar compra</Link>
              </Button>
              <p className="mt-3 text-center text-xs text-muted">Valores calculados pela API; confirmados novamente antes da compra.</p>
            </SummaryCard>
          </div>
        </div>
      )}
    </div>
  )
}
