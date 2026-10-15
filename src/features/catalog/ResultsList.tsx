import type { UseQueryResult } from '@tanstack/react-query'
import type { NftListResponse } from '@/api/contracts'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { PAGE_SIZE } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { NftCard, NftCardSkeleton } from './NftCard'
import { Pagination } from './Pagination'

const GRID = 'grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 xl:grid-cols-3'

interface Props {
  query: UseQueryResult<NftListResponse>
  /** A consulta mostra dados da busca anterior enquanto a nova carrega. */
  isShowingPreviousData: boolean
  hasActiveFilters: boolean
  onClearFilters: () => void
}

/** Lista de NFTs com todos os estados: carregando, erro, vazio e resultados. */
export function ResultsList({ query, isShowingPreviousData, hasActiveFilters, onClearFilters }: Props) {
  const { data, isPending, isError, error, isFetching, refetch } = query

  if (isError && !data) {
    return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} title="Não foi possível carregar o catálogo" />
  }

  if (isPending) {
    return (
      <ul className={GRID} aria-busy="true" aria-label="Carregando catálogo" data-testid="catalog-skeleton">
        {Array.from({ length: PAGE_SIZE }, (_, i) => (
          <li key={i}><NftCardSkeleton /></li>
        ))}
      </ul>
    )
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        title="Nenhum NFT encontrado"
        description={hasActiveFilters ? 'Nenhum item corresponde à busca e aos filtros atuais. Tente remover algum filtro.' : 'O catálogo está vazio no momento.'}
      >
        {hasActiveFilters && <Button onClick={onClearFilters}>Limpar filtros</Button>}
      </EmptyState>
    )
  }

  return (
    <>
      {isError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span>Não foi possível atualizar os resultados. Exibindo os dados mais recentes.</span>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>
        </div>
      )}
      <ul className={cn(GRID, 'transition-opacity', isShowingPreviousData && 'opacity-60')} aria-busy={isShowingPreviousData} data-testid="catalog-grid">
        {data.items.map((nft) => (
          <li key={nft.id}><NftCard nft={nft} /></li>
        ))}
      </ul>
      <Pagination page={data.page} totalPages={data.totalPages} />
    </>
  )
}
