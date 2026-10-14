import { Link } from '@tanstack/react-router'
import type { Nft } from '@/api/contracts'
import { Eth } from '@/components/common/Eth'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { NETWORK_LABELS } from '@/lib/catalog'

export function StockBadge({ nft }: { nft: Pick<Nft, 'available'> }) {
  if (nft.available === 0) return <Badge variant="danger">Esgotado</Badge>
  if (nft.available <= 3) return <Badge variant="warning">Últimas {nft.available} un.</Badge>
  return null
}

export function NftCard({ nft, priority = false }: { nft: Nft; priority?: boolean }) {
  const image = nft.images[0]!
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-muted/60 focus-within:border-accent" data-testid="nft-card" data-nft-id={nft.id}>
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <img
          src={image.src}
          alt={image.alt}
          width={800}
          height={800}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3">
          <StockBadge nft={nft} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">
            <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="rounded-sm after:absolute after:inset-0 after:content-['']">
              {nft.name}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted">{nft.collection.name}</p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-muted">{nft.available === 0 ? 'Último preço' : 'A partir de'}</p>
            <Eth value={nft.priceFrom} className="text-base font-bold" />
          </div>
          <Badge variant="outline">{NETWORK_LABELS[nft.network]}</Badge>
        </div>
      </div>
      <FavoriteButton nft={nft} className="absolute right-3 top-3 z-10" />
    </article>
  )
}

/** Mesmas dimensões do card real — evita deslocamento de layout quando os dados chegam. */
export function NftCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}
