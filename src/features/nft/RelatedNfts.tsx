import { useQuery } from '@tanstack/react-query'
import type { Nft } from '@/api/contracts'
import { nftListOptions } from '@/api/queries'
import { NftCard } from '@/features/catalog/NftCard'
import { CATEGORY_LABELS } from '@/lib/catalog'

/** Até 4 outros NFTs populares da mesma categoria. */
export function RelatedNfts({ nft }: { nft: Nft }) {
  const { data } = useQuery(nftListOptions({ category: [nft.category], sort: 'popular', page: 1, pageSize: 5 }))
  const related = (data?.items ?? []).filter((item) => item.id !== nft.id).slice(0, 4)
  if (related.length === 0) return null

  return (
    <section aria-labelledby="related-title" className="container-page mt-16">
      <h2 id="related-title" className="mb-6 text-2xl font-bold">Mais em {CATEGORY_LABELS[nft.category]}</h2>
      <ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {related.map((item) => <li key={item.id}><NftCard nft={item} /></li>)}
      </ul>
    </section>
  )
}
