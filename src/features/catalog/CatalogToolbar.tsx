import { Search, SlidersHorizontal } from 'lucide-react'
import { SORT_IDS, type SortId } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SORT_LABELS } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { activeFilterCount, type CatalogSearch } from './search'

/** Atalhos de ordenação mostrados como abas acima da lista. */
const SORT_TABS: { sort: SortId; label: string }[] = [
  { sort: 'featured', label: 'Todos os NFTs' },
  { sort: 'newest', label: 'Novos lançamentos' },
  { sort: 'popular', label: 'Em alta' },
]

interface Props {
  search: CatalogSearch
  searchText: string
  onSearchText: (text: string) => void
  onSort: (sort: SortId) => void
  onOpenFilters: () => void
}

export function CatalogToolbar({ search, searchText, onSearchText, onSort, onOpenFilters }: Props) {
  const currentSort = search.sort ?? 'featured'
  const filterCount = activeFilterCount(search)

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form role="search" className="relative flex-1" onSubmit={(e) => e.preventDefault()}>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            name="q"
            aria-label="Buscar NFTs"
            placeholder="Buscar por nome, coleção ou criador"
            className="pl-11"
            value={searchText}
            onChange={(e) => onSearchText(e.target.value)}
          />
        </form>
        {/* O painel de filtros fica fixo ao lado da lista no desktop; abaixo disso abre numa gaveta. */}
        <Button variant="outline" className="lg:hidden" onClick={onOpenFilters} aria-haspopup="dialog">
          <SlidersHorizontal aria-hidden /> Filtros
          {filterCount > 0 && <span className="eth rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{filterCount}</span>}
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border">
        <div role="group" aria-label="Atalhos de ordenação" className="-mb-px flex max-w-full gap-x-6 overflow-x-auto">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.sort}
              type="button"
              aria-pressed={currentSort === tab.sort}
              onClick={() => onSort(tab.sort)}
              className={cn(
                'whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors',
                currentSort === tab.sort ? 'border-primary text-accent' : 'border-transparent hover:text-accent',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pb-2 text-sm">
          <span className="hidden text-muted sm:inline" aria-hidden>Ordenar por:</span>
          <Select value={currentSort} onValueChange={(value) => onSort(value as SortId)}>
            <SelectTrigger aria-label="Ordenar por" className="h-9 w-48 border-transparent bg-transparent px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_IDS.map((id) => (
                <SelectItem key={id} value={id}>{SORT_LABELS[id]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  )
}
