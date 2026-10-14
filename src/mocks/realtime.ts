/**
 * Servidor Socket.IO simulado, sobre MSW (`ws.link`) + @mswjs/socket.io-binding.
 *
 * O binding traduz pacotes Engine.IO/Socket.IO de/para eventos nomeados, mas NÃO implementa:
 * handshake com `auth`, ping/pong do servidor, rooms ou broadcast. Complementamos aqui:
 *  - lemos o pacote CONNECT ("40{...}") do cliente para extrair o token de `auth`;
 *  - enviamos pings Engine.IO ("2") periódicos para o cliente não derrubar a conexão por timeout;
 *  - mantemos nosso próprio registro de conexões para fazer broadcast e entregar eventos por usuário.
 * Só o transporte WebSocket é suportado (o cliente usa `transports: ['websocket']`).
 */
import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { RealtimeEvent } from '@/api/contracts'
import { bus, type Audience } from './bus'
import { getDb } from './db'
import { getScenario } from './scenarios'

const link = ws.link(/\/socket\.io\//)

interface Connection {
  id: number
  userId: string | null
  send: (event: string, payload: unknown) => void
  close: () => void
}

const connections = new Map<number, Connection>()
let nextConnectionId = 1
let manualOutage = false

function resolveUser(token: unknown): string | null {
  if (typeof token !== 'string') return null
  const session = getDb().sessions.find((s) => s.token === token)
  return session && session.expiresAt > Date.now() ? session.userId : null
}

export const realtimeHandlers = [
  link.addEventListener('connection', (connection) => {
    if (manualOutage || !getScenario().realtime.available) {
      connection.client.close(1013, 'Servidor Socket.IO indisponível (simulado)')
      return
    }
    const io = toSocketIo(connection)
    const conn: Connection = {
      id: nextConnectionId++,
      userId: null,
      send: (event, payload) => io.client.emit(event, payload),
      close: () => connection.client.close(1012, 'Conexão encerrada pelo servidor simulado'),
    }
    connections.set(conn.id, conn)

    connection.client.addEventListener('message', (message) => {
      const data = message.data
      // pacote CONNECT do Socket.IO: "40" + JSON do `auth` (o binding não expõe isso)
      if (typeof data === 'string' && data.startsWith('40')) {
        try {
          const auth = data.length > 2 ? JSON.parse(data.slice(2)) : {}
          conn.userId = resolveUser(auth?.token)
        } catch {
          conn.userId = null
        }
      }
    })

    const ping = setInterval(() => connection.client.send('2'), 10_000)
    connection.client.addEventListener('close', () => {
      clearInterval(ping)
      connections.delete(conn.id)
    })
  }),
]

function deliver(event: RealtimeEvent, audience: Audience): void {
  for (const conn of connections.values()) {
    if ('all' in audience || conn.userId === audience.userId) conn.send(event.type, event)
  }
}

bus.subscribe(deliver)

export const realtimeControls = {
  /** Envia um payload arbitrário (inclusive inválido, duplicado, antigo ou de outro usuário). */
  emitRaw(eventName: string, payload: unknown, audience: Audience | 'everyone' = 'everyone'): number {
    let sent = 0
    for (const conn of connections.values()) {
      if (audience === 'everyone' || 'all' in audience || conn.userId === audience.userId) {
        conn.send(eventName, payload)
        sent++
      }
    }
    return sent
  },
  /** Derruba todas as conexões (o cliente tenta reconectar sozinho). */
  dropConnections(): number {
    const all = [...connections.values()]
    for (const c of all) c.close()
    return all.length
  },
  /** Enquanto false, novas conexões são recusadas (interrupção prolongada). */
  setAvailable(available: boolean): void {
    manualOutage = !available
  },
  connectionCount: () => connections.size,
  connections: () => [...connections.values()].map((c) => ({ id: c.id, userId: c.userId })),
}
