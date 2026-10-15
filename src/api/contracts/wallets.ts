import { z } from 'zod'
import { isoDate, networkSchema } from './common'

export const WALLET_PROVIDERS = ['metamask', 'coinbase', 'walletconnect', 'rabby'] as const
export const walletProviderSchema = z.enum(WALLET_PROVIDERS)
export type WalletProvider = z.infer<typeof walletProviderSchema>
export const WALLET_SLOTS = ['primary', 'secondary'] as const
export const walletSlotSchema = z.enum(WALLET_SLOTS)
export type WalletSlot = z.infer<typeof walletSlotSchema>

export const walletSchema = z.object({
  id: z.string(),
  slot: walletSlotSchema,
  label: z.string(),
  address: z.string(),
  provider: walletProviderSchema,
  preferredNetwork: networkSchema,
  connection: z.object({ network: networkSchema, connectedAt: isoDate }).nullable(),
})
export type Wallet = z.infer<typeof walletSchema>
export const walletListSchema = z.object({ items: z.array(walletSchema) })

export const walletFormSchema = z.object({
  slot: walletSlotSchema,
  label: z.string().trim().min(2, 'Dê um nome à carteira (mín. 2 caracteres)').max(40, 'Máximo de 40 caracteres'),
  address: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais'),
  provider: walletProviderSchema,
  preferredNetwork: networkSchema,
})
export type WalletForm = z.infer<typeof walletFormSchema>
export const connectWalletSchema = z.object({ network: networkSchema })
