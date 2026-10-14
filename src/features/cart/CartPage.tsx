import { Link } from '@tanstack/react-router'
import { ShoppingBag, Tag, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { CartItem, QuoteLine } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { Eth } from '@/components/common/Eth'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { MAX_QTY_PER_LINE } from '@/lib/catalog'
import { ethMulInt } from '@/lib/decimal'
import { useApplyCoupon, useCart, useQuote, useRemoveCartItem, useRemoveCoupon, useUpdateCartItem } from './hooks'
import { CartNotices } from './CartNotices'
import { QuoteIssues, QuoteRows, QuoteSkeleton, SummaryCard } from './QuoteSummary'

function CartLineSkeleton() {
  return (
    <li className="flex gap-4 rounded-lg border border-border bg-surface p-4" aria-hidden="true">
      <Skeleton className="size-24 shrink-0 sm:size-28" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-auto h-11 w-32" />
      </div>
    </li>
  )
}

function CartLine({ item, line }: { item: CartItem; line?: QuoteLine }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const [confirming, setConfirming] = useState(false)
  const max = Math.max(1, Math.min(item.available, MAX_QTY_PER_LINE))
  return (
    <li className="flex gap-4 rounded-lg border border-border bg-surface p-4" data-testid="cart-line" data-nft-id={item.nftId}>
      <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="shrink-0 rounded-md" aria-label={`Ver ${item.name}`}>
        <img src={item.image.src} alt={item.image.alt} width={112} height={112} loading="lazy" decoding="async" className="size-24 rounded-md object-cover sm:size-28" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">
              <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }}>{item.name}</Link>
            </h3>
            <p className="text-sm text-muted">Edição {item.editionName} · <Eth value={item.unitPrice} className="text-foreground" /> cada</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={`Remover ${item.name} do carrinho`} onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden />
          </Button>
        </div>
        {line && line.status !== 'ok' && (
          <p role="alert" className="text-sm font-semibold text-warning" data-testid="line-issue">
            {line.status === 'sold_out' ? 'Esta edição esgotou. Remova o item para continuar.' : `Apenas ${Math.min(line.available, MAX_QTY_PER_LINE)} unidade(s) disponível(is). Reduza a quantidade.`}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={item.quantity}
            max={Math.max(max, item.quantity)}
            onChange={(quantity) => update.mutate({ itemId: item.id, quantity, name: item.name })}
            label={`Quantidade de ${item.name}`}
          />
          <p className="text-lg font-bold" data-testid="line-total"><Eth value={ethMulInt(item.unitPrice, item.quantity)} /></p>
        </div>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover item?</DialogTitle>
            <DialogDescription>“{item.name}” ({item.editionName}) será removido do seu carrinho.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={() => { remove.mutate({ itemId: item.id, name: item.name }); setConfirming(false) }}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  )
}

function CouponBox({ couponCode, disabled }: { couponCode: string | null; disabled: boolean }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return setError('Informe o código do cupom')
    setError(undefined)
    apply.mutate(code.trim(), {
      onSuccess: () => {
        setCode('')
        toast.success('Cupom aplicado')
      },
      onError: (err) => setError(toApiError(err).fields.code ?? toApiError(err).message),
    })
  }
  if (couponCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-success/40 bg-success/10 px-4 py-3" data-testid="coupon-applied">
        <p className="flex items-center gap-2 text-sm font-semibold"><Tag className="size-4 text-success" aria-hidden /> Cupom <span className="eth">{couponCode}</span> aplicado</p>
        <Button variant="ghost" size="sm" onClick={() => remove.mutate()} loading={remove.isPending} aria-label={`Remover cupom ${couponCode}`}>
          <X aria-hidden /> Remover
        </Button>
      </div>
    )
  }
  return (
    <form onSubmit={submit} noValidate className="flex items-start gap-2">
      <FormField id="coupon" label="Cupom de desconto" error={error} className="flex-1">
        {(a11y) => (
          <Input {...a11y} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Digite o código" autoComplete="off" disabled={disabled} />
        )}
      </FormField>
      <Button type="submit" variant="secondary" className="mt-[30px]" loading={apply.isPending} disabled={disabled}>Aplicar</Button>
    </form>
  )
}

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
