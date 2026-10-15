import type { Nft } from '@/api/contracts'
import { CATEGORY_LABELS, NETWORK_LABELS } from '@/lib/catalog'
import { formatDate } from '@/lib/format'

/** Atributos do NFT e ficha técnica (rede, categoria, data...). */
export function NftFacts({ nft }: { nft: Nft }) {
  const details: [string, string][] = [
    ['Rede', NETWORK_LABELS[nft.network]],
    ['Categoria', CATEGORY_LABELS[nft.category]],
    ['Coleção', nft.collection.name],
    ['Criado em', formatDate(nft.createdAt)],
    ['Padrão do token', 'ERC-1155 (simulado)'],
    ['Identificador', nft.id],
  ]

  return (
    <section aria-labelledby="attrs-title" className="container-page mt-4 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2">
      <div>
        <h2 id="attrs-title" className="mb-4 text-xl font-bold">Atributos</h2>
        <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
          {nft.traits.map((trait) => (
            <li key={trait.label} className="rounded-md border border-border bg-surface px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted">{trait.label}</p>
              <p className="font-semibold capitalize">{trait.value}</p>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-4 text-xl font-bold">Detalhes</h2>
        <dl className="divide-y divide-border rounded-md border border-border bg-surface text-sm">
          {details.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
