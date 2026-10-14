import { QuoteSkeleton } from '@/features/cart/QuoteSummary'
import { Skeleton } from '@/components/ui/skeleton'

export function CheckoutSkeleton() {
  return (
    <div className="container-page py-8 sm:py-12" data-testid="checkout-skeleton" aria-busy="true" aria-label="Carregando pagamento">
      <Skeleton className="mb-8 h-10 w-56" />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
        <div className="rounded-lg bg-surface p-6">
          <Skeleton className="mb-5 h-7 w-40" />
          <QuoteSkeleton />
        </div>
      </div>
    </div>
  )
}
