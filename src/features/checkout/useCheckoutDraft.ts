import { useEffect } from 'react'
import type { CheckoutForm } from './form'
import { saveDraft } from './storage'

/**
 * Salva o formulário enquanto o usuário digita (por usuário, no localStorage).
 * Assim ele não perde os dados se a página recarregar ou a sessão expirar no meio da compra.
 */
export function useCheckoutDraft(userId: string, values: CheckoutForm): void {
  const { fullName, email, country, document, walletId, network } = values
  useEffect(() => {
    const timer = setTimeout(() => saveDraft(userId, { fullName, email, country, document, walletId, network }), 300)
    return () => clearTimeout(timer)
  }, [userId, fullName, email, country, document, walletId, network])
}
