import type { QueryClient } from '@tanstack/react-query'

/** O que aconteceu com um evento recebido. */
export type EventOutcome =
  | 'applied' // atualizou o cache
  | 'duplicate' // mesmo `id` já processado
  | 'stale' // versão igual ou mais antiga que a já conhecida
  | 'ignored-user' // evento de outro usuário
  | 'invalid' // payload fora do contrato

export interface ProcessorContext {
  queryClient: QueryClient
  /** Usuário dono da conexão (null = visitante). */
  userId: string | null
  /** Abre uma rota da aplicação (usado pelos botões dos avisos). */
  navigate: (to: string) => void
  /** Id do NFT da página de detalhe aberta, se houver. */
  viewingNftId: () => string | null
}
