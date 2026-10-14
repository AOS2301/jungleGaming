import type { RealtimeEvent } from '@/api/contracts'

/** Quem deve receber o evento no servidor simulado. */
export type Audience = { all: true } | { userId: string }
type Listener = (event: RealtimeEvent, audience: Audience) => void

/**
 * Barramento interno do "servidor": o banco simulado publica aqui sempre que um
 * recurso muda; a camada Socket.IO do MSW assina e entrega aos clientes conectados.
 * Assim REST e eventos nunca divergem — ambos nascem da mesma mutação.
 */
const listeners = new Set<Listener>()
export const bus = {
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  publish(event: RealtimeEvent, audience: Audience) {
    for (const l of listeners) l(event, audience)
  },
}
