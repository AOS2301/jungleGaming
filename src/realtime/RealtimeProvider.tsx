import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'
import { REALTIME_EVENTS } from '@/api/contracts'
import { useSession } from '@/features/auth/session'
import { openConnection, type Connection } from './connection'

declare global {
  interface Window {
    /** Diagnóstico para os testes: estado do cliente Socket.IO (só existe com VITE_MOCK_CONTROLS=true). */
    __realtime?: { sockets: () => number; listeners: () => number; connected: () => boolean; userId: () => string | null }
  }
}

// Conexão atual (uma por sessão), só para o diagnóstico acima.
let current: { connection: Connection; userId: string | null } | null = null

if (import.meta.env.VITE_MOCK_CONTROLS === 'true' && typeof window !== 'undefined') {
  const eventNames = [REALTIME_EVENTS.nftUpdated, REALTIME_EVENTS.orderUpdated, 'connect', 'disconnect']
  window.__realtime = {
    sockets: () => (current ? 1 : 0),
    listeners: () => (current ? eventNames.reduce((total, name) => total + current!.connection.socket.listeners(name).length, 0) : 0),
    connected: () => !!current?.connection.socket.connected,
    userId: () => current?.userId ?? null,
  }
}

/**
 * Mantém UMA conexão Socket.IO por sessão. Ao entrar, sair ou trocar de usuário, a conexão antiga é
 * encerrada (com todos os listeners) e uma nova é aberta com o token novo — assim eventos de uma
 * sessão anterior nunca chegam ao cache de outro usuário.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { user } = useSession()
  const userId = user?.id ?? null

  useEffect(() => {
    let cancelled = false
    let connection: Connection | undefined

    // O socket.io-client é carregado sob demanda: ele guarda o WebSocket nativo ao ser importado, e isso
    // precisa acontecer DEPOIS de o MSW instalar o WebSocket simulado.
    void import('socket.io-client').then(({ io }) => {
      if (cancelled) return
      connection = openConnection({ io, queryClient, userId, navigate: (to) => void router.navigate({ to }) })
      current = { connection, userId }
    })

    return () => {
      cancelled = true
      connection?.close()
      if (current?.connection === connection) current = null
    }
  }, [queryClient, router, userId])

  return <>{children}</>
}
