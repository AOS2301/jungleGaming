/**
 * Cenários determinísticos da API simulada.
 *
 * Um cenário é só configuração: latência, falhas injetadas (por rota), resolução de pedidos etc.
 * Presets podem ser combinados com "+" (ex.: `?scenario=slow+payment-declined`).
 * A seleção é persistida em localStorage para sobreviver a refresh.
 */
import type { ErrorCode } from '@/api/contracts'

export type FaultEffect =
  | { kind: 'network-error' }
  | { kind: 'stall' }
  | { kind: 'expire-session' }
  | { kind: 'http'; status: number; code: ErrorCode; message: string; fields?: Record<string, string>; retryable?: boolean }

export interface Fault {
  /** Identificador estável: o contador de ocorrências é persistido no DB (sobrevive a refresh). */
  id: string
  method?: string
  /** Regex testada contra o pathname (ex.: "^/api/nfts$"). */
  path: string
  /** Aplica só nas N primeiras ocorrências; omitido = sempre. */
  times?: number
  effect: FaultEffect
  /** "after": executa o handler (efeito colateral persiste) e só então falha — ex.: timeout após criar pedido. */
  when?: 'before' | 'after'
}

export interface Scenario {
  name: string
  latency: { minMs: number; maxMs: number; strategy: 'random' | 'descending' }
  faults: Fault[]
  catalog: 'full' | 'empty'
  payment: 'confirmed' | 'declined'
  orders: { resolution: 'auto' | 'manual'; delayMs: number }
  walletConnection: 'accept' | 'reject'
  /** Falha injetada uma única vez na criação do pedido. */
  submitConflict: 'none' | 'price-change' | 'sold-out'
  realtime: { available: boolean }
}

export const BASE_SCENARIO: Scenario = {
  name: 'default',
  latency: { minMs: 80, maxMs: 260, strategy: 'random' },
  faults: [],
  catalog: 'full',
  payment: 'confirmed',
  orders: { resolution: 'auto', delayMs: 2200 },
  walletConnection: 'accept',
  submitConflict: 'none',
  realtime: { available: true },
}

type Patch = Partial<Omit<Scenario, 'name'>>

export const PRESETS: Record<string, { description: string; patch: Patch }> = {
  default: { description: 'Sucesso com latência realista (80–260 ms).', patch: {} },
  instant: { description: 'Sem latência — base dos testes E2E.', patch: { latency: { minMs: 0, maxMs: 0, strategy: 'random' }, orders: { resolution: 'auto', delayMs: 400 } } },
  empty: { description: 'Catálogo vazio (resultado vazio).', patch: { catalog: 'empty' } },
  slow: { description: 'Lentidão: 1,8–2,6 s por requisição (skeletons).', patch: { latency: { minMs: 1800, maxMs: 2600, strategy: 'random' } } },
  'variable-latency': { description: 'Latência decrescente na listagem: respostas chegam fora de ordem.', patch: { latency: { minMs: 80, maxMs: 260, strategy: 'descending' } } },
  offline: {
    description: 'Indisponibilidade de conexão: toda requisição REST falha na rede.',
    patch: { faults: [{ id: 'offline', path: '^/api/', effect: { kind: 'network-error' } }] },
  },
  'server-error': {
    description: 'HTTP 500 permanente na listagem de NFTs.',
    patch: { faults: [{ id: 'nfts-500', method: 'GET', path: '^/api/nfts$', effect: { kind: 'http', status: 500, code: 'INTERNAL_ERROR', message: 'Erro interno ao listar NFTs.' } }] },
  },
  flaky: {
    description: 'Falha transitória: as 2 primeiras listagens retornam 503 e depois recuperam.',
    patch: { faults: [{ id: 'nfts-503', method: 'GET', path: '^/api/nfts$', times: 2, effect: { kind: 'http', status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Serviço temporariamente indisponível.', retryable: true } }] },
  },
  'session-expired': {
    description: 'A primeira consulta de sessão retorna 401 SESSION_EXPIRED.',
    patch: { faults: [{ id: 'session-expired', method: 'GET', path: '^/api/session$', times: 1, effect: { kind: 'http', status: 401, code: 'SESSION_EXPIRED', message: 'Sua sessão expirou.' } }] },
  },
  'expire-on-submit': {
    description: 'A sessão expira exatamente ao enviar o pedido (checkout).',
    patch: { faults: [{ id: 'expire-on-submit', method: 'POST', path: '^/api/orders$', times: 1, effect: { kind: 'expire-session' } }] },
  },
  forbidden: {
    description: 'Acesso não autorizado: GET /api/wallets responde 403.',
    patch: { faults: [{ id: 'wallets-403', method: 'GET', path: '^/api/wallets$', effect: { kind: 'http', status: 403, code: 'FORBIDDEN', message: 'Você não tem permissão para acessar este recurso.' } }] },
  },
  'signup-conflict': {
    description: 'Todo cadastro retorna 409 EMAIL_TAKEN.',
    patch: { faults: [{ id: 'signup-409', method: 'POST', path: '^/api/auth/signup$', effect: { kind: 'http', status: 409, code: 'EMAIL_TAKEN', message: 'Este e-mail já está cadastrado.', fields: { email: 'Este e-mail já está cadastrado' } } }] },
  },
  'profile-validation': {
    description: 'PUT /api/profile retorna 422 com erro de campo vindo da API.',
    patch: { faults: [{ id: 'profile-422', method: 'PUT', path: '^/api/profile$', effect: { kind: 'http', status: 422, code: 'VALIDATION_FAILED', message: 'Dados inválidos.', fields: { displayName: 'Este nome não é permitido (regra da API)' } } }] },
  },
  'favorites-fail': {
    description: 'Mutations de favoritos falham com 500 (rollback otimista).',
    patch: { faults: [{ id: 'fav-500', method: undefined, path: '^/api/favorites/', effect: { kind: 'http', status: 500, code: 'INTERNAL_ERROR', message: 'Não foi possível atualizar seus favoritos.' } }] },
  },
  'price-change-on-submit': {
    description: 'O preço do 1º item muda (e emite nft.updated) logo antes da criação do pedido.',
    patch: { submitConflict: 'price-change' },
  },
  'sold-out-on-submit': {
    description: 'A edição do 1º item esgota (e emite nft.updated) logo antes da criação do pedido.',
    patch: { submitConflict: 'sold-out' },
  },
  'order-timeout': {
    description: 'O pedido é criado, mas a resposta nunca chega (timeout). A repetição com a mesma chave recupera o pedido.',
    patch: { faults: [{ id: 'order-timeout', method: 'POST', path: '^/api/orders$', times: 1, when: 'after', effect: { kind: 'stall' } }] },
  },
  'order-503': {
    description: 'A criação do pedido falha uma vez com 503 transitório (antes de gravar).',
    patch: { faults: [{ id: 'order-503', method: 'POST', path: '^/api/orders$', times: 1, effect: { kind: 'http', status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Serviço de pagamentos indisponível.', retryable: true } }] },
  },
  'payment-declined': { description: 'O pagamento é recusado ao resolver o pedido.', patch: { payment: 'declined' } },
  'payment-confirmed': { description: 'O pagamento é confirmado (padrão).', patch: { payment: 'confirmed' } },
  'pending-hold': {
    description: 'Pedidos ficam pendentes até serem resolvidos manualmente (__mocks.orders.resolve).',
    patch: { orders: { resolution: 'manual', delayMs: 0 } },
  },
  'wallet-rejected': { description: 'A conexão da carteira é recusada pelo usuário/provedor.', patch: { walletConnection: 'reject' } },
  'realtime-offline': { description: 'O servidor Socket.IO recusa conexões.', patch: { realtime: { available: false } } },
}

export function mergeScenario(spec: string): Scenario {
  const names = spec
    .split(/[+,]/)
    .map((s) => s.trim())
    .filter(Boolean)
  let result: Scenario = { ...BASE_SCENARIO, faults: [], name: names.join('+') || 'default' }
  for (const name of names) {
    const preset = PRESETS[name]
    if (!preset) {
      console.warn(`[mocks] cenário desconhecido ignorado: ${name}`)
      continue
    }
    result = {
      ...result,
      ...preset.patch,
      faults: [...result.faults, ...(preset.patch.faults ?? [])],
    }
  }
  return result
}

const SCENARIO_KEY = 'jg.mock.scenario'
let current: Scenario = mergeScenario('default')
let currentSpec = 'default'

export function getScenario(): Scenario {
  return current
}
export function getScenarioSpec(): string {
  return currentSpec
}
export function setScenario(spec: string, persist = true): Scenario {
  currentSpec = spec || 'default'
  current = mergeScenario(currentSpec)
  if (persist) {
    try {
      localStorage.setItem(SCENARIO_KEY, currentSpec)
    } catch {
      /* storage indisponível */
    }
  }
  return current
}

export function loadInitialScenario(envDefault: string | undefined): void {
  let spec = envDefault || 'default'
  try {
    const stored = localStorage.getItem(SCENARIO_KEY)
    if (stored) spec = stored
    const fromUrl = new URL(window.location.href).searchParams.get('scenario')
    if (fromUrl) spec = fromUrl
  } catch {
    /* ignore */
  }
  setScenario(spec, true)
}
export const SCENARIO_STORAGE_KEY = SCENARIO_KEY
