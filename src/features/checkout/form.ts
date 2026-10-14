import { z } from 'zod'
import { collectorSchema, networkSchema, type User } from '@/api/contracts'
import type { CheckoutDraft } from './storage'

/** Campos do formulário de pagamento: dados do colecionador + carteira + rede. */
export const checkoutSchema = collectorSchema.extend({
  walletId: z.string().min(1, 'Selecione uma carteira'),
  network: networkSchema,
})
export type CheckoutForm = z.infer<typeof checkoutSchema>

/** Valores iniciais: o rascunho salvo, se existir; senão os dados da conta. */
export function initialFormValues(user: User, draft: CheckoutDraft | null): CheckoutForm {
  return {
    fullName: draft?.fullName ?? user.displayName,
    email: draft?.email ?? user.email,
    country: draft?.country ?? 'BR',
    document: draft?.document ?? '',
    walletId: draft?.walletId ?? '',
    network: draft?.network ?? 'ethereum',
  }
}
