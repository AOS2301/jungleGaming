import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Quote } from '@/api/contracts'

/**
 * Cotação que o usuário viu na etapa de revisão.
 *
 * Se a cotação atual (REST/evento em tempo real) ficar diferente da revisada, `changed` fica true:
 * a tela avisa e só libera a compra depois que o usuário aceitar os novos valores e marcar o aceite de novo.
 */
export function useReviewedQuote(step: 'details' | 'review', quote: UseQueryResult<Quote>) {
  const [reviewed, setReviewed] = useState<Quote | null>(null)
  const [accepted, setAccepted] = useState(false)

  const current = quote.isPlaceholderData ? undefined : quote.data

  // Ao entrar na revisão, guarda a cotação atual; ao voltar para os dados, descarta.
  useEffect(() => {
    if (step === 'review' && !reviewed && current) setReviewed(current)
    if (step === 'details' && reviewed) setReviewed(null)
  }, [step, current, reviewed])

  // Qualquer mudança na cotação revisada exige aceitar de novo.
  useEffect(() => setAccepted(false), [reviewed?.fingerprint])

  const changed = !!(reviewed && current && current.fingerprint !== reviewed.fingerprint)
  const acceptNewQuote = () => current && setReviewed(current)

  return { reviewed, changed, accepted, setAccepted, acceptNewQuote }
}
