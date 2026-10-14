import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { nftListOptions } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ActiveFilterChips } from './ActiveFilterChips'
import { CatalogToolbar } from './CatalogToolbar'
import { FiltersPanel } from './FiltersPanel'
import { ResultsList } from './ResultsList'
import { hasActiveFilters, toApiQuery } from './search'
import { useCatalogSearch } from './useCatalogSearch'

const route = getRouteApi('/')

/** Catálogo: busca, filtros (sidebar no desktop, gaveta no mobile), ordenação, lista e paginação. */
export function CatalogSection() {
  const { search, update, clearAll, searchText, setSearchText } = useCatalogSearch()
  const navigate = route.useNavigate()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const apiQuery = useMemo(() => toApiQuery(search), [search])
  const query = useQuery({ ...nftListOptions(apiQuery), placeholderData: keepPreviousData })
  const { data, isFetching, isPlaceholderData } = query

  // A API limita a página ao total; se a URL pediu uma página inexistente, corrige a URL.
  useEffect(() => {
    if (data && !isPlaceholderData && data.page !== (search.page ?? 1)) {
      void navigate({ search: (prev) => ({ ...prev, page: data.page > 1 ? data.page : undefined }), replace: true, resetScroll: false })
    }
  }, [data, isPlaceholderData, search.page, navigate])

  const filtersActive = hasActiveFilters(search)
  const firstItem = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0
  const lastItem = data ? Math.min(data.page * data.pageSize, data.total) : 0
  const filtersPanelProps = { search, onChange: update, onClear: clearAll, canClear: filtersActive, facets: data?.facets }

  return (
    <section id="catalogo" aria-labelledby="catalogo-title" className="container-page scroll-mt-24 pt-10">
      <h2 id="catalogo-title" className="sr-only">Catálogo</h2>

      <CatalogToolbar
        search={search}
        searchText={searchText}
        onSearchText={setSearchText}
        onSort={(sort) => update({ sort: sort === 'featured' ? undefined : sort })}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      <div className="mb-5 flex flex-col gap-3">
        <ActiveFilterChips search={search} update={update} onClear={clearAll} />
        <p role="status" aria-live="polite" className="text-sm text-muted" data-testid="results-summary">
          {data ? (data.total === 0 ? 'Nenhum resultado' : `Mostrando ${firstItem}–${lastItem} de ${data.total} resultados`) : 'Carregando resultados…'}
          {isFetching && data && (
            <span className="ml-2 inline-flex items-center gap-1 text-accent">
              <RefreshCw className="size-3.5 animate-spin" aria-hidden /> Atualizando…
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Filtros">
          <div className="sticky top-24 rounded-lg bg-surface p-5">
            <FiltersPanel {...filtersPanelProps} idPrefix="side" />
          </div>
        </aside>
        <ResultsList query={query} isShowingPreviousData={isPlaceholderData} hasActiveFilters={filtersActive} onClearFilters={clearAll} />
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent side="left">
          <DialogTitle>Filtros</DialogTitle>
          <DialogDescription>Combine categoria, rede, preço e disponibilidade.</DialogDescription>
          <FiltersPanel {...filtersPanelProps} idPrefix="drawer" />
          <Button className="mt-2" onClick={() => setFiltersOpen(false)}>
            {data ? `Ver ${data.total} resultado${data.total === 1 ? '' : 's'}` : 'Ver resultados'}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  )
}
