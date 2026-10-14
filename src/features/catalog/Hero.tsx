import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { Nft } from '@/api/contracts'
import { featuredOptions } from '@/api/queries'
import { Eth } from '@/components/common/Eth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/** Faixa de abertura: texto de boas-vindas + carrossel com os NFTs em destaque (até 3). */
export function Hero() {
  const { data, isPending } = useQuery(featuredOptions())
  const featured = (data ?? []).slice(0, 3)
  const [current, setCurrent] = useState(0)
  const nft = featured[current]

  return (
    <section aria-labelledby="hero-title" className="container-page grid grid-cols-[minmax(0,1fr)] items-center gap-8 py-10 md:grid-cols-[1.15fr_1fr] md:gap-12 md:py-14">
      <div className="flex flex-col items-start gap-5 md:pl-4">
        <p className="text-sm tracking-wide">Bem-vindo à Kurio</p>
        <h1 id="hero-title" className="text-3xl leading-tight sm:text-4xl lg:text-5xl">Seja dono do futuro da arte digital</h1>
        <p className="max-w-xl text-[15px] text-muted">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
        </p>
        <Button asChild size="lg" className="mt-2 uppercase tracking-wide">
          <a href="#catalogo">Explorar</a>
        </Button>
        <FeaturedDots featured={featured} current={current} onSelect={setCurrent} />
      </div>

      <div role="region" aria-roledescription="carrossel" aria-label="Destaques" className="mx-auto w-full max-w-[440px] md:ml-auto">
        <div className="relative aspect-square overflow-hidden rounded-[18px] bg-surface" data-testid="hero-featured">
          {isPending ? <Skeleton className="size-full rounded-none" /> : nft ? <FeaturedSlide nft={nft} /> : <NoFeatured />}
        </div>
      </div>
    </section>
  )
}

function FeaturedSlide({ nft }: { nft: Nft }) {
  const image = nft.images[0]!
  return (
    <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block size-full" aria-label={`Ver ${nft.name}, NFT em destaque`}>
      <img key={nft.id} src={image.src} alt={image.alt} width={800} height={800} className="size-full animate-fade-in object-cover" />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
        <span className="min-w-0">
          <span className="block truncate font-bold">{nft.name}</span>
          <span className="block truncate text-xs text-muted">{nft.collection.name}</span>
        </span>
        <Eth value={nft.priceFrom} className="shrink-0 font-bold text-accent" unitClassName="text-accent" />
      </span>
    </Link>
  )
}

function NoFeatured() {
  return <p className="flex size-full items-center justify-center p-6 text-center text-muted">Nenhum destaque no momento.</p>
}

function FeaturedDots({ featured, current, onSelect }: { featured: { id: string; name: string }[]; current: number; onSelect: (i: number) => void }) {
  // Durante o carregamento mostra 3 pontos desabilitados, para o layout não pular.
  const dots = featured.length > 0 ? featured : [null, null, null]
  return (
    <div role="group" aria-label="Escolher destaque" className="mt-6 flex gap-3 md:ml-[40%]">
      {dots.map((item, i) => (
        <button
          key={item?.id ?? i}
          type="button"
          disabled={!item}
          onClick={() => onSelect(i)}
          aria-label={item ? `Destaque ${i + 1}: ${item.name}` : `Destaque ${i + 1}`}
          aria-current={i === current ? 'true' : undefined}
          className="group flex size-6 items-center justify-center rounded-full"
        >
          <span className={`size-2.5 rounded-full transition-colors ${i === current ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/70'}`} />
        </button>
      ))}
    </div>
  )
}
