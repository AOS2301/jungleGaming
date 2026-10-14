import { Skeleton } from '@/components/ui/skeleton'

export function OrderSkeleton() {
  return (
    <div className="container-page max-w-3xl py-10" aria-busy="true" aria-label="Carregando pedido" data-testid="order-skeleton">
      <Skeleton className="mx-auto size-20 rounded-full" />
      <Skeleton className="mx-auto mt-6 h-10 w-72" />
      <Skeleton className="mx-auto mt-3 h-6 w-96 max-w-full" />
      <Skeleton className="mt-10 h-72 w-full rounded-lg" />
    </div>
  )
}
