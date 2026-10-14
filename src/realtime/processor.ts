/**
 * Recebe os eventos do Socket.IO e atualiza o cache do TanStack Query.
 *
 * Regras (as mesmas para qualquer evento):
 *  1. payload fora do contrato (zod) é descartado;
 *  2. evento com `id` já processado é ignorado (reentrega);
 *  3. evento com versão antiga é ignorado (nunca volta no tempo);
 *  4. avisos e invalidações só acontecem quando o evento realmente muda algo.
 */
import { nftUpdatedEventSchema, orderUpdatedEventSchema, REALTIME_EVENTS } from '@/api/contracts'
import { handleNftUpdated } from './handleNftUpdated'
import { handleOrderUpdated } from './handleOrderUpdated'
import type { EventOutcome, ProcessorContext } from './types'

export type { EventOutcome, ProcessorContext } from './types'

const MAX_REMEMBERED_EVENTS = 500

export function createEventProcessor(ctx: ProcessorContext) {
  const processedIds = new Set<string>()
  const latestNftVersions = new Map<string, number>()

  const remember = (eventId: string) => {
    processedIds.add(eventId)
    if (processedIds.size > MAX_REMEMBERED_EVENTS) processedIds.delete(processedIds.values().next().value as string)
  }

  function handle(eventName: string, payload: unknown): EventOutcome {
    if (eventName === REALTIME_EVENTS.nftUpdated) {
      const parsed = nftUpdatedEventSchema.safeParse(payload)
      if (!parsed.success) return 'invalid'
      if (processedIds.has(parsed.data.id)) return 'duplicate'
      const outcome = handleNftUpdated(parsed.data, ctx, latestNftVersions)
      if (outcome === 'applied') remember(parsed.data.id)
      return outcome
    }

    if (eventName === REALTIME_EVENTS.orderUpdated) {
      const parsed = orderUpdatedEventSchema.safeParse(payload)
      if (!parsed.success) return 'invalid'
      if (processedIds.has(parsed.data.id)) return 'duplicate'
      const outcome = handleOrderUpdated(parsed.data, ctx)
      if (outcome === 'applied') remember(parsed.data.id)
      return outcome
    }

    return 'invalid'
  }

  return { handle }
}
