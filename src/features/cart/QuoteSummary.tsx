import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Quote } from '@/api/contracts'
import { Eth } from '@/components/common/Eth'
import { Skeleton } from '@/components/ui/skeleton'
import { NETWORK_LABELS } from '@/lib/catalog'
import { cn } from '@/lib/utils'

export function QuoteRows({ quote, dim }: { quote: Quote; dim?: boolean }) {
  return (
    <dl className={cn('flex flex-col gap-3 text-[15px] transition-opacity', dim && 'opacity-60')} data-testid="quote-rows" data-fingerprint={quote.fingerprint}>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Subtotal</dt>
        <dd data-testid="quote-subtotal"><Eth value={quote.subtotal} /></dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">
          Desconto{quote.coupon ? <span className="ml-1 rounded bg-success/15 px-1.5 py-0.5 text-xs font-semibold text-success">{quote.coupon.code}</span> : null}
        </dt>
        <dd data-testid="quote-discount" className={quote.coupon ? 'text-success' : undefined}>
          {quote.coupon ? <>− <Eth value={quote.discount} /></> : <Eth value="0" />}
        </dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Taxa de rede ({NETWORK_LABELS[quote.network]})</dt>
        <dd data-testid="quote-fee"><Eth value={quote.networkFee} /></dd>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-4">
        <dt className="text-base font-bold">Total</dt>
        <dd className="text-xl font-bold" data-testid="quote-total" aria-live="polite"><Eth value={quote.total} /></dd>
      </div>
    </dl>
  )
}

export function QuoteSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Calculando valores" data-testid="quote-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex justify-between gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-4 border-t border-border pt-4">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  )
}

export function SummaryCard({ title = 'Resumo do pedido', children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby="summary-title" className={cn('rounded-lg border border-border bg-surface p-5 sm:p-6', className)}>
      <h2 id="summary-title" className="mb-5 text-xl font-bold">{title}</h2>
      {children}
    </section>
  )
}

export function QuoteIssues({ quote }: { quote: Quote }) {
  const problems = quote.lines.filter((l) => l.status !== 'ok')
  if (problems.length === 0) return null
  return (
    <div role="alert" className="mt-4 flex gap-2.5 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-semibold">Ajuste o carrinho para continuar</p>
        <ul className="mt-1 list-disc pl-4 text-muted">
          {problems.map((l) => (
            <li key={`${l.nftId}-${l.editionId}`}>
              {l.name} ({l.editionName}): {l.status === 'sold_out' ? 'esgotado' : `apenas ${Math.min(l.available, 10)} disponível(is)`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
