import { z } from 'zod'
import { ethSchema, isoDate, networkSchema } from './common'
import { addCartItemSchema } from './cart'
import { walletProviderSchema } from './wallets'

export const ORDER_STATUSES = ['pending', 'confirmed', 'declined'] as const
export const orderStatusSchema = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const collectorSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe o nome completo').max(80),
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  country: z.string().min(2, 'Selecione o país'),
  document: z
    .string()
    .trim()
    .min(5, 'Informe um documento válido (mín. 5 caracteres)')
    .max(20, 'Documento muito longo'),
})
export type Collector = z.infer<typeof collectorSchema>

export const createOrderSchema = z.object({
  items: z.array(addCartItemSchema).min(1, 'O pedido precisa de ao menos um item'),
  couponCode: z.string().nullable(),
  network: networkSchema,
  walletId: z.string().min(1, 'Selecione uma carteira'),
  collector: collectorSchema,
  /** Fingerprint da cotação que o usuário revisou e confirmou. */
  quoteFingerprint: z.string().min(1),
})
export type CreateOrderRequest = z.infer<typeof createOrderSchema>

export const orderItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  editionName: z.string(),
  image: z.object({ src: z.string(), alt: z.string() }),
  quantity: z.number().int(),
  unitPrice: ethSchema,
  lineTotal: ethSchema,
})
export type OrderItem = z.infer<typeof orderItemSchema>

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  /** Versão monotônica: estados terminais (confirmed/declined) nunca regridem. */
  version: z.number().int(),
  createdAt: isoDate,
  updatedAt: isoDate,
  network: networkSchema,
  items: z.array(orderItemSchema),
  subtotal: ethSchema,
  discount: ethSchema,
  networkFee: ethSchema,
  total: ethSchema,
  couponCode: z.string().nullable(),
  wallet: z.object({ id: z.string(), label: z.string(), provider: walletProviderSchema, addressMasked: z.string() }),
  collector: collectorSchema,
  tx: z.object({ hash: z.string(), explorerUrl: z.string(), blockNumber: z.number().int(), confirmedAt: isoDate }).nullable(),
  decline: z.object({ code: z.string(), message: z.string() }).nullable(),
})
export type Order = z.infer<typeof orderSchema>
export const orderListSchema = z.object({ items: z.array(orderSchema) })
