import { z } from 'zod'
import { categorySchema, ethSchema, isoDate, networkSchema, sortSchema } from './common'

export const editionSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: ethSchema,
  total: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: categorySchema,
  network: networkSchema,
  collection: z.object({ id: z.string(), name: z.string() }),
  creator: z.object({ id: z.string(), name: z.string(), handle: z.string(), avatar: z.string() }),
  images: z.array(z.object({ src: z.string(), alt: z.string() })).min(1),
  traits: z.array(z.object({ label: z.string(), value: z.string() })),
  editions: z.array(editionSchema).min(1),
  /** Menor preço entre as edições disponíveis (ou entre todas, se esgotado). */
  priceFrom: ethSchema,
  /** Soma das unidades disponíveis em todas as edições. */
  available: z.number().int().nonnegative(),
  featured: z.boolean(),
  popularity: z.number().int(),
  createdAt: isoDate,
  /** Versão monotônica do recurso — usada para ordenar eventos. */
  version: z.number().int().nonnegative(),
})
export type Nft = z.infer<typeof nftSchema>

export const nftListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.array(categorySchema).optional(),
  network: z.array(networkSchema).optional(),
  minPrice: ethSchema.optional(),
  maxPrice: ethSchema.optional(),
  available: z.boolean().optional(),
  sort: sortSchema.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type NftListQuery = z.infer<typeof nftListQuerySchema>

export const nftListResponseSchema = z.object({
  items: z.array(nftSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  /** Contagem por categoria/rede considerando os demais filtros (facets), para a sidebar. */
  facets: z.object({ category: z.record(z.number().int()), network: z.record(z.number().int()) }),
  /** Eco dos parâmetros efetivamente aplicados pela API (já normalizados). */
  query: z.object({
    q: z.string().nullable(),
    category: z.array(z.string()),
    network: z.array(z.string()),
    minPrice: z.string().nullable(),
    maxPrice: z.string().nullable(),
    available: z.boolean(),
    sort: z.string(),
  }),
})
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const featuredResponseSchema = z.object({ items: z.array(nftSchema) })
