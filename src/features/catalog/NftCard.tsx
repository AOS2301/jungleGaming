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

/** Card no estilo da referência: imagem inserida em painel escuro, texto abaixo e preço em cobre. */
export function NftCard({ nft, priority = false }: { nft: Nft; priority?: boolean }) {
  const image = nft.images[0]!
  return (
    <article className="group relative flex h-full flex-col gap-3" data-testid="nft-card" data-nft-id={nft.id}>
      <div className="relative rounded-lg bg-surface p-2 transition-colors group-hover:bg-surface-2 group-focus-within:bg-surface-2">
        <div className="relative aspect-square overflow-hidden rounded-[10px] bg-surface-2">
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
          <div className="absolute left-2.5 top-2.5">
            <StockBadge nft={nft} />
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-0.5">
        <h3 className="truncate text-base font-semibold normal-case">
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="rounded-sm after:absolute after:inset-0 after:content-['']">
            {nft.name}
          </Link>
        </h3>
        <p className="truncate text-xs leading-4 text-muted">{nft.collection.name}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <Eth value={nft.priceFrom} className="text-base font-bold text-accent" unitClassName="text-accent" />
          {nft.available === 0 ? <span className="text-xs text-muted">último preço</span> : <Badge variant="outline">{NETWORK_LABELS[nft.network]}</Badge>}
        </div>
      </div>
      <FavoriteButton nft={nft} className="absolute right-4 top-4 z-10" />
    </article>
  )
}

/** Mesmas dimensões do card real — evita deslocamento de layout quando os dados chegam. */
export function NftCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3" aria-hidden="true">
      <div className="rounded-lg bg-surface p-2">
        <Skeleton className="aspect-square w-full rounded-[10px]" />
      </div>
      <div className="flex flex-1 flex-col px-0.5">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="mt-0 h-4 w-1/2" />
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}
