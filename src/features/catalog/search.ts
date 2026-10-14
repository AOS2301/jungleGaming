/**
 * Estado do catálogo na URL: ?q=&category=art,music&network=&min=&max=&available=true&sort=&page=
 * A URL é a única fonte do estado de busca — refresh, links e histórico (voltar/avançar) restauram a tela.
 */
import { categorySchema, networkSchema, sortSchema, type CategoryId, type NetworkId, type NftListQuery, type SortId } from '@/api/contracts'
import { isEthString } from '@/lib/decimal'
import { PAGE_SIZE } from '@/lib/catalog'

export interface CatalogSearch {
  q?: string
  category?: string
  network?: string
  min?: string
  max?: string
  available?: boolean
  sort?: SortId
  page?: number
}

const csv = (value: unknown): string[] => (typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : [])
export const toCsv = (values: readonly string[]): string | undefined => (values.length ? values.join(',') : undefined)

export function validateCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, 80) : undefined
  const category = toCsv(csv(raw.category).filter((c) => categorySchema.safeParse(c).success))
  const network = toCsv(csv(raw.network).filter((n) => networkSchema.safeParse(n).success))
  const min = typeof raw.min === 'string' && isEthString(raw.min) ? raw.min : undefined
  const max = typeof raw.max === 'string' && isEthString(raw.max) ? raw.max : undefined
  const available = raw.available === true || raw.available === 'true' ? true : undefined
  const sortParsed = sortSchema.safeParse(raw.sort)
  const sort = sortParsed.success && sortParsed.data !== 'featured' ? sortParsed.data : undefined
  const page = Number.parseInt(String(raw.page ?? ''), 10)
  return {
    q: q || undefined,
    category,
    network,
    min,
    max,
    available,
    sort,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

/** Parâmetros da URL → parâmetros enviados à API (a chave da consulta é derivada daqui). */
export function toApiQuery(search: CatalogSearch): NftListQuery {
  return {
    q: search.q,
    category: csv(search.category) as CategoryId[],
    network: csv(search.network) as NetworkId[],
    minPrice: search.min,
    maxPrice: search.max,
    available: search.available,
    sort: search.sort ?? 'featured',
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
  }
}

export const hasActiveFilters = (s: CatalogSearch) => !!(s.q || s.category || s.network || s.min || s.max || s.available)
export const activeFilterCount = (s: CatalogSearch) =>
  csv(s.category).length + csv(s.network).length + (s.min || s.max ? 1 : 0) + (s.available ? 1 : 0)
export { csv as splitCsv }
