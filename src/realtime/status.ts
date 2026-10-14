import { createStore, useStore } from '@/lib/store'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline'
export const connectionStore = createStore<ConnectionStatus>('connecting')
export const useConnectionStatus = () => useStore(connectionStore)

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Conectando…',
  connected: 'Ao vivo',
  reconnecting: 'Reconectando…',
  offline: 'Sem conexão em tempo real',
}
