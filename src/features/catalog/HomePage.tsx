import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SORT_IDS, type SortId } from '@/api/contracts'
import { featuredOptions, nftListOptions } from '@/api/queries'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { CATEGORY_LABELS, NETWORK_LABELS, PAGE_SIZE, SORT_LABELS } from '@/lib/catalog'
import { FiltersPanel } from './FiltersPanel'
import { NftCard, NftCardSkeleton } from './NftCard'
import { Pagination } from './Pagination'
import { activeFilterCount, hasActiveFilters, splitCsv, toApiQuery, toCsv, type CatalogSearch } from './search'

const route = getRouteApi('/')

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-border bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.28),transparent_60%)]">
      <div className="container-page grid items-center gap-10 py-12 md:grid-cols-2 md:py-16 lg:py-20">
        <div className="flex flex-col items-start gap-6">
          <p className="eth rounded-full border border-border px-3 py-1 text-xs text-accent">Ethereum · Polygon · Arbitrum · Base</p>
          <h1 id="hero-title" className="text-4xl font-bold sm:text-5xl lg:text-6xl">
            Descubra, colecione e negocie <span className="text-accent">NFTs únicos</span>
          </h1>
          <p className="max-w-xl text-lg text-muted">Obras digitais de criadores independentes, com edições limitadas e certificado de autenticidade. Compre com sua carteira em poucos cliques.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#catalogo">Explorar catálogo <ArrowRight aria-hidden /></a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#destaques">Ver destaques</a>
            </Button>
          </div>
        </div>
        <Link to="/nfts/$nftId" params={{ nftId: 'nft-001' }} className="mx-auto block w-full max-w-md rounded-lg" aria-label="Ver Aurora Drift, NFT em destaque">
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-2 shadow-2xl shadow-primary/20">
            <img src="/nfts/nft-001.svg" alt="Composição abstrata em tons de violeta e âmbar — Aurora Drift" width={800} height={800} fetchPriority="high" decoding="async" className="size-full object-cover" />
          </div>
        </Link>
      </div>
    </section>
  )
}

function Featured() {
  const { data, isPending, isError, refetch } = useQuery(featuredOptions())
  const scroller = useRef<HTMLDivElement>(null)
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  if (!isPending && !isError && (data?.length ?? 0) === 0) return null
  return (
    <section id="destaques" aria-labelledby="destaques-title" className="container-page pt-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 id="destaques-title" className="text-2xl font-bold sm:text-3xl">Destaques</h2>
          <p className="text-muted">Seleção da semana pela curadoria.</p>
        </div>
        <div className="hidden gap-2 md:flex">
          <Button variant="outline" size="icon" onClick={() => scrollBy(-1)} aria-label="Destaques anteriores"><ChevronLeft aria-hidden /></Button>
          <Button variant="outline" size="icon" onClick={() => scrollBy(1)} aria-label="Próximos destaques"><ChevronRight aria-hidden /></Button>
        </div>
      </div>
      {isError ? (
        <ErrorState error={new Error('Não foi possível carregar os destaques.')} onRetry={() => void refetch()} />
      ) : (
        <div ref={scroller} role="group" aria-roledescription="carrossel" aria-label="Destaques" className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {(isPending ? Array.from({ length: 4 }) : data!).map((nft, i) => (
            <div key={nft ? (nft as { id: string }).id : i} className="w-[72vw] max-w-[320px] shrink-0 snap-start sm:w-[300px]">
              {nft ? <NftCard nft={nft as NonNullable<typeof data>[number]} /> : <NftCardSkeleton />}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ActiveFilterChips({ search, onChange, onClear }: { search: CatalogSearch; onChange: (p: Partial<CatalogSearch>) => void; onClear: () => void }) {
  const chips: { key: string; label: string; remove: () => void }[] = []
  if (search.q) chips.push({ key: 'q', label: `Busca: “${search.q}”`, remove: () => onChange({ q: undefined }) })
  for (const c of splitCsv(search.category)) chips.push({ key: `c-${c}`, label: CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c, remove: () => onChange({ category: toCsv(splitCsv(search.category).filter((x) => x !== c)) }) })
  for (const n of splitCsv(search.network)) chips.push({ key: `n-${n}`, label: NETWORK_LABELS[n as keyof typeof NETWORK_LABELS] ?? n, remove: () => onChange({ network: toCsv(splitCsv(search.network).filter((x) => x !== n)) }) })
  if (search.min || search.max) chips.push({ key: 'price', label: `Preço: ${search.min ?? '0'} – ${search.max ?? '∞'} ETH`, remove: () => onChange({ min: undefined, max: undefined }) })
  if (search.available) chips.push({ key: 'avail', label: 'Somente disponíveis', remove: () => onChange({ available: undefined }) })
  if (chips.length === 0) return null
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button type="button" onClick={chip.remove} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2" aria-label={`Remover filtro ${chip.label}`}>
            {chip.label}
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <Button variant="link" size="sm" onClick={onClear}>Limpar tudo</Button>
      </li>
    </ul>
  )
}

function Catalog() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const query = useMemo(() => toApiQuery(search), [search])

  const { data, isPending, isError, error, isFetching, isPlaceholderData, refetch } = useQuery({ ...nftListOptions(query), placeholderData: keepPreviousData })

  // busca com debounce — só o texto digitado é "empurrado" para a URL (replace) e reinicia a paginação
  const [text, setText] = useState(search.q ?? '')
  const lastPushed = useRef(search.q ?? '')
  const debounced = useDebouncedValue(text, 350)
  useEffect(() => {
    if ((search.q ?? '') !== lastPushed.current) {
      lastPushed.current = search.q ?? ''
      setText(search.q ?? '') // mudança externa: histórico/links
    }
  }, [search.q])
  useEffect(() => {
    const next = debounced.trim()
    if (next === lastPushed.current) return
    lastPushed.current = next
    void navigate({ search: (prev) => ({ ...prev, q: next || undefined, page: undefined }), replace: true, resetScroll: false })
  }, [debounced, navigate])

  const update = (patch: Partial<CatalogSearch>) => {
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), resetScroll: false })
  }
  const clearAll = () => {
    lastPushed.current = ''
    setText('')
    void navigate({ search: (prev: CatalogSearch) => ({ sort: prev.sort }), resetScroll: false })
  }

  // a API limita a página ao total; mantém a URL coerente
  useEffect(() => {
    if (data && !isPlaceholderData && data.page !== (search.page ?? 1)) void navigate({ search: (prev) => ({ ...prev, page: data.page > 1 ? data.page : undefined }), replace: true, resetScroll: false })
  }, [data, isPlaceholderData, search.page, navigate])

  const filtersActive = hasActiveFilters(search)
  const from = data ? (data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1) : 0
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0

  return (
    <section id="catalogo" aria-labelledby="catalogo-title" className="container-page scroll-mt-24 pt-16">
      <div className="mb-6">
        <h2 id="catalogo-title" className="text-2xl font-bold sm:text-3xl">Catálogo</h2>
        <p className="text-muted">Busque por nome, coleção ou criador e combine filtros.</p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form role="search" className="relative flex-1" onSubmit={(e) => e.preventDefault()}>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" aria-label="Buscar NFTs" placeholder="Buscar por nome, coleção ou criador" className="pl-11" value={text} onChange={(e) => setText(e.target.value)} name="q" />
        </form>
        <div className="flex gap-3">
          <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal aria-hidden /> Filtros{activeFilterCount(search) > 0 && <span className="eth rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{activeFilterCount(search)}</span>}
          </Button>
          <Select value={search.sort ?? 'featured'} onValueChange={(sort) => update({ sort: sort === 'featured' ? undefined : (sort as SortId) })}>
            <SelectTrigger aria-label="Ordenar por" className="w-full sm:w-52">
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

      <div className="mb-5 flex flex-col gap-3">
        <ActiveFilterChips search={search} onChange={update} onClear={clearAll} />
        <p role="status" aria-live="polite" className="text-sm text-muted" data-testid="results-summary">
          {data ? (data.total === 0 ? 'Nenhum resultado' : `Mostrando ${from}–${to} de ${data.total} resultados`) : 'Carregando resultados…'}
          {isFetching && data && <span className="ml-2 inline-flex items-center gap-1 text-accent"><RefreshCw className="size-3.5 animate-spin" aria-hidden /> Atualizando…</span>}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="Filtros">
          <div className="sticky top-24 rounded-lg border border-border bg-surface p-5">
            <FiltersPanel search={search} onChange={update} onClear={clearAll} idPrefix="side" canClear={filtersActive} />
          </div>
        </aside>

        <div>
          {isError && !data ? (
            <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} title="Não foi possível carregar o catálogo" />
          ) : isPending ? (
            <ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Carregando catálogo" data-testid="catalog-skeleton">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <li key={i}><NftCardSkeleton /></li>
              ))}
            </ul>
          ) : data.items.length === 0 ? (
            <EmptyState title="Nenhum NFT encontrado" description={filtersActive ? 'Nenhum item corresponde à busca e aos filtros atuais. Tente remover algum filtro.' : 'O catálogo está vazio no momento.'}>
              {filtersActive && <Button onClick={clearAll}>Limpar filtros</Button>}
            </EmptyState>
          ) : (
            <>
              {isError && (
                <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                  <span>Não foi possível atualizar os resultados. Exibindo os dados mais recentes.</span>
                  <Button size="sm" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>
                </div>
              )}
              <ul className={`grid grid-cols-1 gap-5 transition-opacity min-[480px]:grid-cols-2 xl:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={isPlaceholderData} data-testid="catalog-grid">
                {data.items.map((nft, i) => (
                  <li key={nft.id}>
                    <NftCard nft={nft} priority={i < 3} />
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} totalPages={data.totalPages} />
            </>
          )}
        </div>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent side="left">
          <DialogTitle>Filtros</DialogTitle>
          <DialogDescription>Combine categoria, rede, preço e disponibilidade.</DialogDescription>
          <FiltersPanel search={search} onChange={update} onClear={clearAll} idPrefix="drawer" canClear={filtersActive} />
          <Button className="mt-2" onClick={() => setFiltersOpen(false)}>
            {data ? `Ver ${data.total} resultado${data.total === 1 ? '' : 's'}` : 'Ver resultados'}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export function HomePage() {
  useDocumentTitle()
  return (
    <>
      <Hero />
      <Featured />
      <Catalog />
    </>
  )
}
