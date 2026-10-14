import { z } from 'zod'
import { ethSchema, isoDate } from './common'
import { orderSchema, orderStatusSchema } from './orders'

export const REALTIME_EVENTS = { nftUpdated: 'nft.updated', orderUpdated: 'order.updated' } as const

const eventBase = {
  /** Identidade estável do evento — usada para deduplicar reenvios. */
  id: z.string(),
  /** Versão do recurso afetado — usada para descartar eventos antigos. */
  version: z.number().int(),
  occurredAt: isoDate,
}

export const nftUpdatedEventSchema = z.object({
  ...eventBase,
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  data: z.object({
    editions: z.array(z.object({ id: z.string(), price: ethSchema, available: z.number().int().nonnegative() })),
    priceFrom: ethSchema,
    available: z.number().int().nonnegative(),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  ...eventBase,
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  /** Dono do pedido — o cliente descarta eventos de outro usuário. */
  userId: z.string(),
  data: z.object({ status: orderStatusSchema, order: orderSchema }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
