import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORY_LABELS, NETWORK_LABELS } from '@/lib/catalog'
import { splitCsv, toCsv, type CatalogSearch } from './search'

interface Chip {
  key: string
  label: string
  remove: () => void
}

/** Um "chip" removível para cada filtro ativo. */
function buildChips(search: CatalogSearch, update: (patch: Partial<CatalogSearch>) => void): Chip[] {
  const chips: Chip[] = []
  const categories = splitCsv(search.category)
  const networks = splitCsv(search.network)

  if (search.q) {
    chips.push({ key: 'q', label: `Busca: “${search.q}”`, remove: () => update({ q: undefined }) })
  }
  for (const id of categories) {
    chips.push({
      key: `category-${id}`,
      label: CATEGORY_LABELS[id as keyof typeof CATEGORY_LABELS] ?? id,
      remove: () => update({ category: toCsv(categories.filter((c) => c !== id)) }),
    })
  }
  for (const id of networks) {
    chips.push({
      key: `network-${id}`,
      label: NETWORK_LABELS[id as keyof typeof NETWORK_LABELS] ?? id,
      remove: () => update({ network: toCsv(networks.filter((n) => n !== id)) }),
    })
  }
  if (search.min || search.max) {
    chips.push({ key: 'price', label: `Preço: ${search.min ?? '0'} – ${search.max ?? '∞'} ETH`, remove: () => update({ min: undefined, max: undefined }) })
  }
  if (search.available) {
    chips.push({ key: 'available', label: 'Somente disponíveis', remove: () => update({ available: undefined }) })
  }
  return chips
}

export function ActiveFilterChips({ search, update, onClear }: { search: CatalogSearch; update: (patch: Partial<CatalogSearch>) => void; onClear: () => void }) {
  const chips = buildChips(search, update)
  if (chips.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.remove}
            aria-label={`Remover filtro ${chip.label}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2"
          >
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
