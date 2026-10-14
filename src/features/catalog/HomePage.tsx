import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Eth } from '@/components/common/Eth'
import { Skeleton } from '@/components/ui/skeleton'
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

/** Hero com o carrossel de destaques (dados da API) — a altura é fixa para não causar deslocamento de layout. */
function Hero() {
  const { data, isPending } = useQuery(featuredOptions())
  const slides = (data ?? []).slice(0, 3)
  const [index, setIndex] = useState(0)
  const nft = slides[Math.min(index, Math.max(0, slides.length - 1))]
  return (
    <section aria-labelledby="hero-title" className="container-page grid items-center gap-8 py-10 md:grid-cols-[1.15fr_1fr] md:gap-12 md:py-14">
      <div className="flex flex-col items-start gap-5 md:pl-4">
        <p className="text-sm tracking-wide">Bem-vindo à Kurio</p>
        <h1 id="hero-title" className="text-3xl leading-tight sm:text-4xl lg:text-5xl">Seja dono do futuro da arte digital</h1>
        <p className="max-w-xl text-[15px] text-muted">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
        <Button asChild size="lg" className="mt-2 uppercase tracking-wide">
          <a href="#catalogo">Explorar</a>
        </Button>
        <div role="group" aria-label="Escolher destaque" className="mt-6 flex gap-3 md:ml-[40%]">
          {(slides.length ? slides : [null, null, null]).map((s, i) => (
            <button
              key={s?.id ?? i}
              type="button"
              disabled={!s}
              onClick={() => setIndex(i)}
              aria-label={s ? `Destaque ${i + 1}: ${s.name}` : `Destaque ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              className="group flex size-6 items-center justify-center rounded-full"
            >
              <span className={`size-2.5 rounded-full transition-colors ${i === index ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/70'}`} />
            </button>
          ))}
        </div>
      </div>
      <div role="region" aria-roledescription="carrossel" aria-label="Destaques" className="mx-auto w-full max-w-[440px] md:ml-auto">
        <div className="relative aspect-square overflow-hidden rounded-[18px] bg-surface" data-testid="hero-featured">
          {isPending ? (
            <Skeleton className="size-full rounded-none" />
          ) : nft ? (
            <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="group block size-full" aria-label={`Ver ${nft.name}, NFT em destaque`}>
              <img key={nft.id} src={nft.images[0]!.src} alt={nft.images[0]!.alt} width={800} height={800} fetchPriority="high" decoding="async" className="size-full animate-fade-in object-cover" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{nft.name}</span>
                  <span className="block truncate text-xs text-muted">{nft.collection.name}</span>
                </span>
                <Eth value={nft.priceFrom} className="shrink-0 font-bold text-accent" unitClassName="text-accent" />
              </span>
            </Link>
          ) : (
            <p className="flex size-full items-center justify-center p-6 text-center text-muted">Nenhum destaque no momento.</p>
          )}
        </div>
      </div>
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
    <section id="catalogo" aria-labelledby="catalogo-title" className="container-page scroll-mt-24 pt-10">
      <h2 id="catalogo-title" className="sr-only">Catálogo</h2>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form role="search" className="relative flex-1" onSubmit={(e) => e.preventDefault()}>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" aria-label="Buscar NFTs" placeholder="Buscar por nome, coleção ou criador" className="pl-11" value={text} onChange={(e) => setText(e.target.value)} name="q" />
        </form>
        <div className="flex gap-3">
          <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal aria-hidden /> Filtros{activeFilterCount(search) > 0 && <span className="eth rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{activeFilterCount(search)}</span>}
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border">
        <div role="group" aria-label="Atalhos de ordenação" className="flex flex-wrap gap-x-6">
          {([['featured', 'Todos os NFTs'], ['newest', 'Novos lançamentos'], ['popular', 'Em alta']] as const).map(([id, label]) => {
            const active = (search.sort ?? 'featured') === id
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => update({ sort: id === 'featured' ? undefined : id })}
                className={`-mb-px border-b-2 py-3 text-sm font-medium transition-colors ${active ? 'border-primary text-accent' : 'border-transparent hover:text-accent'}`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 pb-2 text-sm">
          <span className="hidden text-muted sm:inline" aria-hidden>Ordenar por:</span>
          <Select value={search.sort ?? 'featured'} onValueChange={(sort) => update({ sort: sort === 'featured' ? undefined : (sort as SortId) })}>
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

      <div className="mb-5 flex flex-col gap-3">
        <ActiveFilterChips search={search} onChange={update} onClear={clearAll} />
        <p role="status" aria-live="polite" className="text-sm text-muted" data-testid="results-summary">
          {data ? (data.total === 0 ? 'Nenhum resultado' : `Mostrando ${from}–${to} de ${data.total} resultados`) : 'Carregando resultados…'}
          {isFetching && data && <span className="ml-2 inline-flex items-center gap-1 text-accent"><RefreshCw className="size-3.5 animate-spin" aria-hidden /> Atualizando…</span>}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block" aria-label="Filtros">
          <div className="sticky top-24 rounded-lg bg-surface p-5">
            <FiltersPanel search={search} onChange={update} onClear={clearAll} idPrefix="side" canClear={filtersActive} facets={data?.facets} />
          </div>
        </aside>

        <div>
          {isError && !data ? (
            <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} title="Não foi possível carregar o catálogo" />
          ) : isPending ? (
            <ul className="grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Carregando catálogo" data-testid="catalog-skeleton">
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
              <ul className={`grid grid-cols-1 gap-x-5 gap-y-8 transition-opacity min-[480px]:grid-cols-2 xl:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={isPlaceholderData} data-testid="catalog-grid">
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
          <FiltersPanel search={search} onChange={update} onClear={clearAll} idPrefix="drawer" canClear={filtersActive} facets={data?.facets} />
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
      <Catalog />
    </>
  )
}
