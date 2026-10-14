import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'
import type { Socket } from 'socket.io-client'
import { REALTIME_EVENTS } from '@/api/contracts'
import { qk } from '@/api/queries'
import { getToken } from '@/features/auth/token-store'
import { useSession } from '@/features/auth/session'
import { createEventProcessor } from './processor'
import { connectionStore } from './status'
import { socketOrigin } from './url'

declare global {
  interface Window {
    /** Diagnóstico para testes: estado do cliente Socket.IO (somente com VITE_MOCK_CONTROLS). */
    __realtime?: { sockets: () => number; listeners: () => number; connected: () => boolean; userId: () => string | null }
  }
}

let activeSocket: Socket | null = null
let activeUserId: string | null = null

if (import.meta.env.VITE_MOCK_CONTROLS === 'true' && typeof window !== 'undefined') {
  window.__realtime = {
    sockets: () => (activeSocket ? 1 : 0),
    listeners: () => (activeSocket ? [REALTIME_EVENTS.nftUpdated, REALTIME_EVENTS.orderUpdated, 'connect', 'disconnect'].reduce((n, e) => n + activeSocket!.listeners(e).length, 0) : 0),
    connected: () => !!activeSocket?.connected,
    userId: () => activeUserId,
  }
}

/**
 * Mantém UMA conexão Socket.IO por sessão. Ao trocar de usuário/sair, a conexão e todos os
 * listeners são encerrados e uma nova é criada com a credencial nova — eventos da sessão
 * anterior não alcançam o cache do novo usuário.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { user } = useSession()
  const userId = user?.id ?? null

  useEffect(() => {
    let disposed = false
    let teardown: (() => void) | undefined
    // Import sob demanda: (1) o engine.io-client captura `globalThis.WebSocket` ao carregar, então
    // precisa ser avaliado DEPOIS de o MSW instalar a interceptação; (2) tira o chunk do caminho crítico.
    void import('socket.io-client').then(({ io }) => {
      if (!disposed) teardown = connect(io)
    })
    return () => {
      disposed = true
      teardown?.()
    }

    function connect(io: typeof import('socket.io-client').io): () => void {
      const scope = userId ?? 'guest'
      const processor = createEventProcessor({
        queryClient,
        userId,
        navigate: (to) => void router.navigate({ to }),
        viewingNftId: () => window.location.pathname.match(/^\/nfts\/([^/]+)/)?.[1] ?? null,
      })

      const socket = io(socketOrigin(), {
        path: '/socket.io',
        // O servidor simulado (MSW) só intercepta WebSocket; long-polling não é suportado.
        transports: ['websocket'],
        auth: (cb) => cb({ token: getToken() }),
        reconnection: true,
        reconnectionDelay: 400,
        reconnectionDelayMax: 3_000,
        timeout: 5_000,
      })
      activeSocket = socket
      activeUserId = userId
      connectionStore.set('connecting')

      let everConnected = false
      const onConnect = () => {
        connectionStore.set('connected')
        if (everConnected) {
          // Reconexão: eventos podem ter sido perdidos — a REST é a fonte de verdade.
          void queryClient.invalidateQueries({ queryKey: qk.nfts, refetchType: 'active' })
          void queryClient.invalidateQueries({ queryKey: qk.priv(scope), refetchType: 'active' })
        }
        everConnected = true
      }
      const onDisconnect = () => connectionStore.set(everConnected ? 'reconnecting' : 'offline')
      const onNft = (payload: unknown) => processor.handle(REALTIME_EVENTS.nftUpdated, payload)
      const onOrder = (payload: unknown) => processor.handle(REALTIME_EVENTS.orderUpdated, payload)
      const onAttempt = () => connectionStore.set(everConnected ? 'reconnecting' : 'connecting')
      const onError = () => connectionStore.set(everConnected ? 'reconnecting' : 'offline')

      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('connect_error', onError)
      socket.io.on('reconnect_attempt', onAttempt)
      socket.on(REALTIME_EVENTS.nftUpdated, onNft)
      socket.on(REALTIME_EVENTS.orderUpdated, onOrder)

      return () => {
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off('connect_error', onError)
        socket.io.off('reconnect_attempt', onAttempt)
        socket.off(REALTIME_EVENTS.nftUpdated, onNft)
        socket.off(REALTIME_EVENTS.orderUpdated, onOrder)
        socket.disconnect()
        if (activeSocket === socket) {
          activeSocket = null
          activeUserId = null
        }
      }
    }
  }, [queryClient, router, userId])

  return <>{children}</>
}
