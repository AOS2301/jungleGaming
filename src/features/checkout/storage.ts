/**
 * Persistência local do checkout, sempre por usuário:
 *  - rascunho do formulário (sobrevive a refresh e à expiração de sessão: o usuário retoma de onde parou);
 *  - chave de idempotência da tentativa de compra em andamento.
 * Nada aqui contém senhas. Os dados são apagados no logout e quando outro usuário entra.
 */
import type { CreateOrderRequest, NetworkId } from '@/api/contracts'
import { readJson, removeKey, writeJson } from '@/lib/storage'

export interface CheckoutDraft {
  fullName: string
  email: string
  country: string
  document: string
  walletId: string
  network: NetworkId
}

const draftKey = (userId: string) => `jg.checkout.${userId}`
const attemptKey = (userId: string) => `jg.idem.${userId}`

export const loadDraft = (userId: string) => readJson<CheckoutDraft>(draftKey(userId))
export const saveDraft = (userId: string, draft: CheckoutDraft) => writeJson(draftKey(userId), draft)
export const clearDraft = (userId: string) => removeKey(draftKey(userId))

interface Attempt { key: string; payload: string }

/** Conteúdo canônico do pedido: se for idêntico, a repetição reutiliza a MESMA chave de idempotência. */
export const canonicalPayload = (p: CreateOrderRequest) =>
  JSON.stringify({
    items: [...p.items].sort((a, b) => `${a.nftId}/${a.editionId}`.localeCompare(`${b.nftId}/${b.editionId}`)),
    couponCode: p.couponCode,
    network: p.network,
    walletId: p.walletId,
    collector: p.collector,
    quoteFingerprint: p.quoteFingerprint,
  })

export function getIdempotencyKey(userId: string, payload: CreateOrderRequest): string {
  const canonical = canonicalPayload(payload)
  const stored = readJson<Attempt>(attemptKey(userId))
  if (stored && stored.payload === canonical) return stored.key
  const attempt: Attempt = { key: crypto.randomUUID(), payload: canonical }
  writeJson(attemptKey(userId), attempt)
  return attempt.key
}
export const clearIdempotencyKey = (userId: string) => removeKey(attemptKey(userId))
