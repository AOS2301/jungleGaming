import type { QueryClient } from '@tanstack/react-query'
import type { io as createSocket, Socket } from 'socket.io-client'
import { REALTIME_EVENTS } from '@/api/contracts'
import { qk } from '@/api/queries'
import { getToken } from '@/features/auth/token-store'
import { createEventProcessor } from './processor'
import { connectionStore } from './status'
import { socketOrigin } from './url'

interface Options {
  io: typeof createSocket
  queryClient: QueryClient
  /** Usuário logado (null = visitante). Um socket novo é criado sempre que isso muda. */
  userId: string | null
  navigate: (to: string) => void
}

export interface Connection {
  socket: Socket
  /** Remove os listeners e desconecta. */
  close: () => void
}

/** Abre a conexão Socket.IO da sessão atual e liga os eventos `nft.updated` e `order.updated` ao cache. */
export function openConnection({ io, queryClient, userId, navigate }: Options): Connection {
  const scope = userId ?? 'guest'
  const processor = createEventProcessor({
    queryClient,
    userId,
    navigate,
    viewingNftId: () => window.location.pathname.match(/^\/nfts\/([^/]+)/)?.[1] ?? null,
  })

  const socket = io(socketOrigin(), {
    path: '/socket.io',
    // O servidor simulado (MSW) só intercepta WebSocket, então não usamos long-polling.
    transports: ['websocket'],
    auth: (sendAuth) => sendAuth({ token: getToken() }),
    reconnectionDelay: 400,
    reconnectionDelayMax: 3_000,
    timeout: 5_000,
  })
  connectionStore.set('connecting')

  let connectedBefore = false

  const onConnect = () => {
    connectionStore.set('connected')
    if (connectedBefore) {
      // Reconectou: eventos podem ter se perdido. A REST é a fonte da verdade, então busca tudo que está na tela de novo.
      void queryClient.invalidateQueries({ queryKey: qk.nfts, refetchType: 'active' })
      void queryClient.invalidateQueries({ queryKey: qk.priv(scope), refetchType: 'active' })
    }
    connectedBefore = true
  }
  const onLostConnection = () => connectionStore.set(connectedBefore ? 'reconnecting' : 'offline')
  const onReconnectAttempt = () => connectionStore.set(connectedBefore ? 'reconnecting' : 'connecting')
  const onNftUpdated = (payload: unknown) => processor.handle(REALTIME_EVENTS.nftUpdated, payload)
  const onOrderUpdated = (payload: unknown) => processor.handle(REALTIME_EVENTS.orderUpdated, payload)

  socket.on('connect', onConnect)
  socket.on('disconnect', onLostConnection)
  socket.on('connect_error', onLostConnection)
  socket.io.on('reconnect_attempt', onReconnectAttempt)
  socket.on(REALTIME_EVENTS.nftUpdated, onNftUpdated)
  socket.on(REALTIME_EVENTS.orderUpdated, onOrderUpdated)

  return {
    socket,
    close: () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onLostConnection)
      socket.off('connect_error', onLostConnection)
      socket.io.off('reconnect_attempt', onReconnectAttempt)
      socket.off(REALTIME_EVENTS.nftUpdated, onNftUpdated)
      socket.off(REALTIME_EVENTS.orderUpdated, onOrderUpdated)
      socket.disconnect()
    },
  }
}
