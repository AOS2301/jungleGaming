import { z } from 'zod'
import { ETH_DECIMAL_RE } from '@/lib/decimal'

/** Valores primitivos compartilhados pelos contratos. */
export const isoDate = z.string()
export const ethSchema = z.string().regex(ETH_DECIMAL_RE, 'Valor ETH inválido')

export const CATEGORY_IDS = ['art', 'photography', 'music', 'games', 'collectibles', '3d'] as const
export const NETWORK_IDS = ['ethereum', 'polygon', 'arbitrum', 'base'] as const
export const SORT_IDS = ['featured', 'newest', 'popular', 'price_asc', 'price_desc'] as const
export const categorySchema = z.enum(CATEGORY_IDS)
export const networkSchema = z.enum(NETWORK_IDS)
export const sortSchema = z.enum(SORT_IDS)
export type CategoryId = z.infer<typeof categorySchema>
export type NetworkId = z.infer<typeof networkSchema>
export type SortId = z.infer<typeof sortSchema>

export const COUNTRIES = [
  { code: 'BR', name: 'Brasil' },
  { code: 'PT', name: 'Portugal' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'AR', name: 'Argentina' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'JP', name: 'Japão' },
] as const
