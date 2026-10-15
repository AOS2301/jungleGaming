import { Skeleton } from '@/components/ui/skeleton'

/** Mesma estrutura da página pronta (galeria + coluna de informações), para a tela não "pular". */
export function NftDetailSkeleton() {
  return (
    <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-10 py-8 lg:grid-cols-2" aria-busy="true" aria-label="Carregando NFT" data-testid="detail-skeleton">
      <div>
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-square w-full" />)}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-11 w-40" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
