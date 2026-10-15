import type { UseQueryResult } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import type { Quote } from '@/api/contracts'
import { ErrorState } from '@/components/common/States'
import { QuoteIssues, QuoteRows, QuoteSkeleton, SummaryCard } from '@/features/cart/QuoteSummary'

/** Coluna da direita: itens do carrinho e valores (subtotal, desconto, taxa, total) calculados pela API. */
export function OrderSummary({ quote }: { quote: UseQueryResult<Quote> }) {
  return (
    <SummaryCard>
      {quote.isPending ? (
        <QuoteSkeleton />
      ) : quote.isError && !quote.data ? (
        <ErrorState error={quote.error} onRetry={() => void quote.refetch()} className="px-2 py-6" title="Falha ao calcular" />
      ) : (
        <>
          <ul className="mb-5 flex flex-col gap-3" aria-label="Itens">
            {quote.data!.lines.map((line) => (
              <li key={`${line.nftId}-${line.editionId}`} className="flex items-center gap-3 text-sm">
                <img src={line.image.src} alt="" width={44} height={44} className="size-11 rounded object-cover" />
                <span className="min-w-0 flex-1 truncate">
                  {line.name} <span className="text-muted">({line.editionName}) × {line.quantity}</span>
                </span>
              </li>
            ))}
          </ul>
          <QuoteRows quote={quote.data!} dim={quote.isFetching} />
          <QuoteIssues quote={quote.data!} />
        </>
      )}
      {quote.isFetching && !quote.isPending && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Loader2 className="size-3 animate-spin" aria-hidden /> Atualizando cotação…</p>
      )}
    </SummaryCard>
  )
}
