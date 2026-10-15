import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { Nft } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { nftDetailOptions } from '@/api/queries'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { CATEGORY_LABELS } from '@/lib/catalog'
import { Gallery } from './Gallery'
import { NftDetailSkeleton } from './NftDetailSkeleton'
import { NftFacts } from './NftFacts'
import { PurchasePanel } from './PurchasePanel'
import { RelatedNfts } from './RelatedNfts'

const route = getRouteApi('/nfts/$nftId')

export function NftDetailPage() {
  const { nftId } = route.useParams()
  const { data: nft, isPending, isError, error, refetch, isFetching } = useQuery(nftDetailOptions(nftId))
  useDocumentTitle(nft?.name ?? (isError ? 'NFT não encontrado' : 'Carregando NFT'))

  if (isPending) return <NftDetailSkeleton />

  if (isError) {
    const notFound = isApiError(error) && error.status === 404
    return (
      <div className="container-page py-16">
        {notFound ? (
          <EmptyState title="NFT não encontrado" description={`Não existe um NFT com o identificador “${nftId}”. Ele pode ter sido removido ou o link está incorreto.`}>
            <Button asChild><Link to="/">Voltar ao catálogo</Link></Button>
          </EmptyState>
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} title="Não foi possível carregar este NFT" />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-10 py-8 lg:grid-cols-2 lg:gap-14">
        <div>
          <Breadcrumb nft={nft} />
          <Gallery nft={nft} />
        </div>
        <div className="flex flex-col gap-6 lg:pt-10">
          <NftHeader nft={nft} />
          <p className="text-muted">{nft.description}</p>
          <PurchasePanel nft={nft} />
        </div>
      </div>
      <NftFacts nft={nft} />
      <RelatedNfts nft={nft} />
    </>
  )
}

function Breadcrumb({ nft }: { nft: Nft }) {
  return (
    <nav aria-label="Você está em" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
      <Link to="/" className="hover:text-foreground">Marketplace</Link>
      <ChevronRight className="size-3.5" aria-hidden />
      <Link to="/" search={{ category: nft.category }} className="hover:text-foreground">{CATEGORY_LABELS[nft.category]}</Link>
      <ChevronRight className="size-3.5" aria-hidden />
      <span aria-current="page" className="truncate text-foreground">{nft.name}</span>
    </nav>
  )
}

function NftHeader({ nft }: { nft: Nft }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-accent">{nft.collection.name}</p>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">{nft.name}</h1>
        <FavoriteButton nft={nft} withLabel className="shrink-0" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <img src={nft.creator.avatar} alt="" width={40} height={40} className="size-10 rounded-full" />
        <div>
          <p className="text-xs text-muted">Criador</p>
          <p className="font-semibold">{nft.creator.name} <span className="font-normal text-muted">@{nft.creator.handle}</span></p>
        </div>
      </div>
    </div>
  )
}
