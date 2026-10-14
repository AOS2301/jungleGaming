import { QueryClient } from '@tanstack/react-query'
import { isTransient } from './errors'

/**
 * Política de cache e retries (documentada em ARCHITECTURE.md):
 *  - leituras: até 2 retries com backoff exponencial, SOMENTE para falhas transitórias
 *    (rede, timeout, 5xx, 429); 4xx nunca é repetido;
 *  - mutations: sem retry automático (cada mutation decide; pedidos usam idempotência);
 *  - staleTime padrão 30 s; refetch ao recuperar foco/reconexão de rede;
 *  - gcTime 5 min; dados privados vivem sob a chave ['u', <userId|'guest'>, ...] e são
 *    removidos no logout/expiração/troca de usuário.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => failureCount < 2 && isTransient(error),
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: { retry: false },
    },
  })
}
