import { z } from 'zod'
import { ethSchema, isoDate, networkSchema } from './common'

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
  name: z.string(),
  editionName: z.string(),
  image: z.object({ src: z.string(), alt: z.string() }),
  unitPrice: ethSchema,
  available: z.number().int().nonnegative(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  couponCode: z.string().nullable(),
  version: z.number().int(),
  updatedAt: isoDate,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
})
export type AddCartItemRequest = z.infer<typeof addCartItemSchema>

export const quoteLineSchema = z.object({
  cartItemId: z.string().nullable(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  editionName: z.string(),
  image: z.object({ src: z.string(), alt: z.string() }),
  quantity: z.number().int(),
  unitPrice: ethSchema,
  lineTotal: ethSchema,
  available: z.number().int(),
  status: z.enum(['ok', 'insufficient', 'sold_out']),
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteSchema = z.object({
  network: networkSchema,
  currency: z.literal('ETH'),
  lines: z.array(quoteLineSchema),
  subtotal: ethSchema,
  discount: ethSchema,
  networkFee: ethSchema,
  total: ethSchema,
  coupon: z
    .object({ code: z.string(), label: z.string(), type: z.enum(['percent', 'fixed']), value: z.string() })
    .nullable(),
  couponError: z.object({ code: z.string(), message: z.string() }).nullable(),
  /** false quando alguma linha está esgotada/insuficiente ou o carrinho está vazio. */
  canCheckout: z.boolean(),
  /** Hash do conteúdo financeiro da cotação; o pedido só é aceito com o fingerprint atual. */
  fingerprint: z.string(),
  generatedAt: isoDate,
})
export type Quote = z.infer<typeof quoteSchema>

export const applyCouponSchema = z.object({ code: z.string().trim().min(1, 'Informe o cupom') })
