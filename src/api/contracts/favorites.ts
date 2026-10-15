import { z } from 'zod'

export const favoritesResponseSchema = z.object({ nftIds: z.array(z.string()) })
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>
