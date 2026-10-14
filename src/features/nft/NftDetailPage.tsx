import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useRouter } from '@tanstack/react-router'
import { ChevronRight, ShoppingBag, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Edition, Nft } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { nftDetailOptions, nftListOptions } from '@/api/queries'
import { Eth } from '@/components/common/Eth'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import { useAddToCart, useCart } from '@/features/cart/hooks'
import { NftCard } from '@/features/catalog/NftCard'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { CATEGORY_LABELS, MAX_QTY_PER_LINE, NETWORK_LABELS } from '@/lib/catalog'
import { ethMulInt } from '@/lib/decimal'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const route = getRouteApi('/nfts/$nftId')

function Gallery({ nft }: { nft: Nft }) {
  const [index, setIndex] = useState(0)
  const current = nft.images[Math.min(index, nft.images.length - 1)]!
  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-2">
        <img src={current.src} alt={current.alt} width={800} height={800} fetchPriority="high" decoding="async" className="size-full object-cover" />
      </div>
      {nft.images.length > 1 && (
        <ul className="grid grid-cols-4 gap-3" aria-label="Galeria de imagens">
          {nft.images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                aria-label={`Mostrar imagem ${i + 1} de ${nft.images.length}`}
                className={cn('block aspect-square w-full overflow-hidden rounded-md border-2 transition-colors', i === index ? 'border-primary' : 'border-transparent opacity-75 hover:opacity-100')}
              >
                <img src={img.src} alt="" width={200} height={200} loading="lazy" decoding="async" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function NftDetailSkeleton() {
  return (
    <div className="container-page grid gap-10 py-8 grid-cols-[minmax(0,1fr)] lg:grid-cols-2" aria-busy="true" aria-label="Carregando NFT" data-testid="detail-skeleton">
      <div>
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="mt-4 grid grid-cols-4 gap-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="aspect-square w-full" />)}
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

function Purchase({ nft }: { nft: Nft }) {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const router = useRouter()
  const { isAuthenticated } = useSession()
  const cart = useCart()
  const addToCart = useAddToCart()
  const [quantity, setQuantity] = useState(1)

  const requested = nft.editions.find((e) => e.id === search.edition)
  const defaultEdition = nft.editions.find((e) => e.available > 0) ?? nft.editions[0]!
  const edition: Edition = requested ?? defaultEdition
  const soldOut = edition.available === 0
  const inCart = cart.data?.items.find((i) => i.nftId === nft.id && i.editionId === edition.id)?.quantity ?? 0
  const limit = Math.min(edition.available, MAX_QTY_PER_LINE)
  const remaining = Math.max(0, limit - inCart)
  const effectiveQty = Math.min(quantity, Math.max(1, remaining))

  // disponibilidade mudou em tempo real: mantém a quantidade dentro do novo limite
  useEffect(() => {
    if (remaining > 0 && quantity > remaining) setQuantity(remaining)
  }, [remaining, quantity])

  const total = useMemo(() => ethMulInt(edition.price, effectiveQty), [edition.price, effectiveQty])
  const disabled = soldOut || remaining === 0

  const add = (then?: 'checkout') =>
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: effectiveQty, name: nft.name },
      {
        onSuccess: () => {
          if (then === 'checkout') void router.navigate({ to: '/checkout' })
          else void router.navigate({ to: '/cart' })
        },
      },
    )

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Edição</legend>
        <RadioGroup value={edition.id} onValueChange={(id) => void navigate({ search: { edition: id }, replace: true, resetScroll: false })} aria-label="Escolha a edição" className="sm:grid-cols-2">
          {nft.editions.map((e) => (
            <RadioGroupItem key={e.id} value={e.id} disabled={false} aria-describedby={`ed-${e.id}`} data-testid={`edition-${e.id}`} className={cn(e.available === 0 && 'opacity-75')}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold">{e.name}</span>
                <Eth value={e.price} className="text-sm font-bold" />
              </span>
              <span id={`ed-${e.id}`} className={cn('mt-1 block text-[13px]', e.available === 0 ? 'font-semibold text-danger' : 'text-muted')}>
                {e.available === 0 ? 'Esgotada' : `${e.available} de ${e.total} disponíveis`}
              </span>
            </RadioGroupItem>
          ))}
        </RadioGroup>
      </fieldset>

      {soldOut && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm" data-testid="edition-unavailable">
          A edição <strong>{edition.name}</strong> está esgotada.{' '}
          {nft.editions.some((e) => e.available > 0) ? 'Escolha outra edição para comprar.' : 'Este NFT não tem unidades disponíveis no momento.'}
        </p>
      )}

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Preço da edição {edition.name}</p>
            <p key={edition.price} className="animate-fade-in text-3xl font-bold" data-testid="detail-price">
              <Eth value={edition.price} unitClassName="text-base" />
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qty" className="text-sm font-semibold">Quantidade</label>
            <QuantityStepper id="qty" value={effectiveQty} onChange={setQuantity} max={Math.max(1, remaining)} disabled={disabled} />
          </div>
        </div>
        <p className="mt-3 text-[13px] text-muted" data-testid="qty-hint" aria-live="polite">
          {soldOut
            ? 'Sem unidades disponíveis nesta edição.'
            : remaining === 0
              ? `Você já tem o máximo disponível (${inCart}) no carrinho.`
              : `Máximo de ${limit} por compra${edition.available > limit ? '' : ` · ${edition.available} disponíve${edition.available === 1 ? 'l' : 'is'}`}${inCart ? ` · ${inCart} já no carrinho` : ''}.`}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted">Total ({effectiveQty} un.)</span>
          <Eth value={total} className="text-lg font-bold" />
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="flex-1" disabled={disabled} loading={addToCart.isPending} onClick={() => add()}>
            <ShoppingBag aria-hidden /> {soldOut ? 'Esgotado' : 'Adicionar ao carrinho'}
          </Button>
          <Button size="lg" variant="outline" className="flex-1" disabled={disabled} loading={addToCart.isPending} onClick={() => add('checkout')}>
            <Zap aria-hidden /> {isAuthenticated ? 'Comprar agora' : 'Entrar e comprar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Related({ nft }: { nft: Nft }) {
  const { data } = useQuery(nftListOptions({ category: [nft.category], sort: 'popular', page: 1, pageSize: 5 }))
  const items = (data?.items ?? []).filter((i) => i.id !== nft.id).slice(0, 4)
  if (items.length === 0) return null
  return (
    <section aria-labelledby="related-title" className="container-page mt-16">
      <h2 id="related-title" className="mb-6 text-2xl font-bold">Mais em {CATEGORY_LABELS[nft.category]}</h2>
      <ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {items.map((n) => (
          <li key={n.id}><NftCard nft={n} /></li>
        ))}
      </ul>
    </section>
  )
}

export function NftDetailPage() {
  const { nftId } = route.useParams()
  const { data: nft, isPending, isError, error, refetch, isFetching } = useQuery(nftDetailOptions(nftId))
  useDocumentTitle(nft?.name ?? (isError ? 'NFT não encontrado' : 'Carregando NFT'))

  if (isPending) return <NftDetailSkeleton />
  if (isError) {
    return (
      <div className="container-page py-16">
        {isApiError(error) && error.status === 404 ? (
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
      <div className="container-page grid gap-10 py-8 grid-cols-[minmax(0,1fr)] lg:grid-cols-2 lg:gap-14">
        <div>
          <nav aria-label="Você está em" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <Link to="/" className="hover:text-foreground">Marketplace</Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link to="/" search={{ category: nft.category }} className="hover:text-foreground">{CATEGORY_LABELS[nft.category]}</Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span aria-current="page" className="truncate text-foreground">{nft.name}</span>
          </nav>
          <Gallery nft={nft} />
        </div>
        <div className="flex flex-col gap-6 lg:pt-10">
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
          <p className="text-muted">{nft.description}</p>
          <Purchase nft={nft} />
        </div>
      </div>

      <section aria-labelledby="attrs-title" className="container-page mt-4 grid gap-8 grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
        <div>
          <h2 id="attrs-title" className="mb-4 text-xl font-bold">Atributos</h2>
          <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
            {nft.traits.map((t) => (
              <li key={t.label} className="rounded-md border border-border bg-surface px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted">{t.label}</p>
                <p className="font-semibold capitalize">{t.value}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold">Detalhes</h2>
          <dl className="divide-y divide-border rounded-md border border-border bg-surface text-sm">
            {[
              ['Rede', NETWORK_LABELS[nft.network]],
              ['Categoria', CATEGORY_LABELS[nft.category]],
              ['Coleção', nft.collection.name],
              ['Criado em', formatDate(nft.createdAt)],
              ['Padrão do token', 'ERC-1155 (simulado)'],
              ['Identificador', nft.id],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <Related nft={nft} />
    </>
  )
}
