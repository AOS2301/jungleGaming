/**
 * Contratos REST e de eventos — fonte única de verdade.
 *
 * Os schemas zod são usados em três lugares:
 *  - cliente HTTP: valida as respostas (transporte → estado);
 *  - handlers MSW: tipam o que a API simulada devolve;
 *  - cliente Socket.IO: valida o payload dos eventos antes de tocar no cache.
 *
 * Valores em ETH sempre trafegam como string decimal; quantidades são inteiras.
 */
import { z } from 'zod'
import { ETH_DECIMAL_RE } from '@/lib/decimal'

// ---------- primitivos ----------
export const ethSchema = z.string().regex(ETH_DECIMAL_RE, 'Valor ETH inválido')
export const isoDate = z.string()

export const CATEGORY_IDS = ['art', 'photography', 'music', 'games', 'collectibles', '3d'] as const
export const NETWORK_IDS = ['ethereum', 'polygon', 'arbitrum', 'base'] as const
export const SORT_IDS = ['featured', 'newest', 'popular', 'price_asc', 'price_desc'] as const
export const categorySchema = z.enum(CATEGORY_IDS)
export const networkSchema = z.enum(NETWORK_IDS)
export const sortSchema = z.enum(SORT_IDS)
export type CategoryId = z.infer<typeof categorySchema>
export type NetworkId = z.infer<typeof networkSchema>
export type SortId = z.infer<typeof sortSchema>

// ---------- erros ----------
export const ERROR_CODES = [
  'VALIDATION_FAILED', // 422
  'UNAUTHENTICATED', // 401 — sem credencial / inválida
  'SESSION_EXPIRED', // 401 — credencial válida que expirou
  'INVALID_CREDENTIALS', // 401 — login
  'FORBIDDEN', // 403
  'NOT_FOUND', // 404
  'EMAIL_TAKEN', // 409
  'USERNAME_TAKEN', // 409
  'WALLET_ADDRESS_IN_USE', // 409
  'WALLET_SLOT_TAKEN', // 409
  'WALLET_CONNECTION_REJECTED', // 403
  'WALLET_NOT_CONNECTED', // 409
  'COUPON_INVALID', // 422
  'COUPON_EXPIRED', // 422
  'COUPON_MIN_NOT_MET', // 422
  'AVAILABILITY_CONFLICT', // 409
  'QUOTE_CHANGED', // 409
  'IDEMPOTENCY_KEY_REQUIRED', // 400
  'IDEMPOTENCY_KEY_REUSED', // 409
  'SERVICE_UNAVAILABLE', // 503 (transitório)
  'INTERNAL_ERROR', // 500
  'RATE_LIMITED', // 429
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    /** Erros por campo (422): { email: "E-mail já cadastrado" } */
    fields: z.record(z.string()).optional(),
    /** Dados adicionais: nova cotação em QUOTE_CHANGED, linhas em AVAILABILITY_CONFLICT... */
    details: z.unknown().optional(),
    retryable: z.boolean().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

// ---------- usuário / sessão ----------
export const userSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const authResponseSchema = z.object({
  accessToken: z.string(),
  expiresAt: isoDate,
  user: userSchema,
})
export type AuthResponse = z.infer<typeof authResponseSchema>

export const sessionResponseSchema = z.object({ user: userSchema, expiresAt: isoDate })
export type SessionResponse = z.infer<typeof sessionResponseSchema>

export const PASSWORD_RULE_MESSAGE = 'Use ao menos 8 caracteres, com maiúscula, minúscula e número'
export const passwordSchema = z
  .string()
  .min(8, PASSWORD_RULE_MESSAGE)
  .regex(/[a-z]/, PASSWORD_RULE_MESSAGE)
  .regex(/[A-Z]/, PASSWORD_RULE_MESSAGE)
  .regex(/\d/, PASSWORD_RULE_MESSAGE)

export const loginRequestSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe sua senha'),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const signupRequestSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome (mín. 2 caracteres)').max(60),
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  password: passwordSchema,
})
export type SignupRequest = z.infer<typeof signupRequestSchema>

// ---------- NFTs ----------
export const editionSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: ethSchema,
  total: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: categorySchema,
  network: networkSchema,
  collection: z.object({ id: z.string(), name: z.string() }),
  creator: z.object({ id: z.string(), name: z.string(), handle: z.string(), avatar: z.string() }),
  images: z.array(z.object({ src: z.string(), alt: z.string() })).min(1),
  traits: z.array(z.object({ label: z.string(), value: z.string() })),
  editions: z.array(editionSchema).min(1),
  /** Menor preço entre as edições disponíveis (ou entre todas, se esgotado). */
  priceFrom: ethSchema,
  /** Soma das unidades disponíveis em todas as edições. */
  available: z.number().int().nonnegative(),
  featured: z.boolean(),
  popularity: z.number().int(),
  createdAt: isoDate,
  /** Versão monotônica do recurso — usada para ordenar eventos. */
  version: z.number().int().nonnegative(),
})
export type Nft = z.infer<typeof nftSchema>

export const nftListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.array(categorySchema).optional(),
  network: z.array(networkSchema).optional(),
  minPrice: ethSchema.optional(),
  maxPrice: ethSchema.optional(),
  available: z.boolean().optional(),
  sort: sortSchema.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type NftListQuery = z.infer<typeof nftListQuerySchema>

export const nftListResponseSchema = z.object({
  items: z.array(nftSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  /** Contagem por categoria/rede considerando os demais filtros (facets), para a sidebar. */
  facets: z.object({ category: z.record(z.number().int()), network: z.record(z.number().int()) }),
  /** Eco dos parâmetros efetivamente aplicados pela API (já normalizados). */
  query: z.object({
    q: z.string().nullable(),
    category: z.array(z.string()),
    network: z.array(z.string()),
    minPrice: z.string().nullable(),
    maxPrice: z.string().nullable(),
    available: z.boolean(),
    sort: z.string(),
  }),
})
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const featuredResponseSchema = z.object({ items: z.array(nftSchema) })

// ---------- favoritos ----------
export const favoritesResponseSchema = z.object({ nftIds: z.array(z.string()) })
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>

// ---------- carrinho / cotação ----------
export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
  name: z.string(),
  editionName: z.string(),
  image: z.object({ src: z.string(), alt: z.string() }),
  unitPrice: ethSchema,
  available: z.number().int().nonnegative(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  couponCode: z.string().nullable(),
  version: z.number().int(),
  updatedAt: isoDate,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
})
export type AddCartItemRequest = z.infer<typeof addCartItemSchema>

export const quoteLineSchema = z.object({
  cartItemId: z.string().nullable(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  editionName: z.string(),
  image: z.object({ src: z.string(), alt: z.string() }),
  quantity: z.number().int(),
  unitPrice: ethSchema,
  lineTotal: ethSchema,
  available: z.number().int(),
  status: z.enum(['ok', 'insufficient', 'sold_out']),
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteSchema = z.object({
  network: networkSchema,
  currency: z.literal('ETH'),
  lines: z.array(quoteLineSchema),
  subtotal: ethSchema,
  discount: ethSchema,
  networkFee: ethSchema,
  total: ethSchema,
  coupon: z
    .object({ code: z.string(), label: z.string(), type: z.enum(['percent', 'fixed']), value: z.string() })
    .nullable(),
  couponError: z.object({ code: z.string(), message: z.string() }).nullable(),
  /** false quando alguma linha está esgotada/insuficiente ou o carrinho está vazio. */
  canCheckout: z.boolean(),
  /** Hash do conteúdo financeiro da cotação; o pedido só é aceito com o fingerprint atual. */
  fingerprint: z.string(),
  generatedAt: isoDate,
})
export type Quote = z.infer<typeof quoteSchema>

export const applyCouponSchema = z.object({ code: z.string().trim().min(1, 'Informe o cupom') })

// ---------- carteiras ----------
export const WALLET_PROVIDERS = ['metamask', 'coinbase', 'walletconnect', 'rabby'] as const
export const walletProviderSchema = z.enum(WALLET_PROVIDERS)
export type WalletProvider = z.infer<typeof walletProviderSchema>
export const WALLET_SLOTS = ['primary', 'secondary'] as const
export const walletSlotSchema = z.enum(WALLET_SLOTS)
export type WalletSlot = z.infer<typeof walletSlotSchema>

export const walletSchema = z.object({
  id: z.string(),
  slot: walletSlotSchema,
  label: z.string(),
  address: z.string(),
  provider: walletProviderSchema,
  preferredNetwork: networkSchema,
  connection: z.object({ network: networkSchema, connectedAt: isoDate }).nullable(),
})
export type Wallet = z.infer<typeof walletSchema>
export const walletListSchema = z.object({ items: z.array(walletSchema) })

export const walletFormSchema = z.object({
  slot: walletSlotSchema,
  label: z.string().trim().min(2, 'Dê um nome à carteira (mín. 2 caracteres)').max(40, 'Máximo de 40 caracteres'),
  address: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais'),
  provider: walletProviderSchema,
  preferredNetwork: networkSchema,
})
export type WalletForm = z.infer<typeof walletFormSchema>
export const connectWalletSchema = z.object({ network: networkSchema })

// ---------- pedidos ----------
export const ORDER_STATUSES = ['pending', 'confirmed', 'declined'] as const
export const orderStatusSchema = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const collectorSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe o nome completo').max(80),
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  country: z.string().min(2, 'Selecione o país'),
  document: z
    .string()
    .trim()
    .min(5, 'Informe um documento válido (mín. 5 caracteres)')
    .max(20, 'Documento muito longo'),
})
export type Collector = z.infer<typeof collectorSchema>

export const createOrderSchema = z.object({
  items: z.array(addCartItemSchema).min(1, 'O pedido precisa de ao menos um item'),
  couponCode: z.string().nullable(),
  network: networkSchema,
  walletId: z.string().min(1, 'Selecione uma carteira'),
  collector: collectorSchema,
  /** Fingerprint da cotação que o usuário revisou e confirmou. */
  quoteFingerprint: z.string().min(1),
})
export type CreateOrderRequest = z.infer<typeof createOrderSchema>

export const orderItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  editionName: z.string(),
  image: z.object({ src: z.string(), alt: z.string() }),
  quantity: z.number().int(),
  unitPrice: ethSchema,
  lineTotal: ethSchema,
})
export type OrderItem = z.infer<typeof orderItemSchema>

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  /** Versão monotônica: estados terminais (confirmed/declined) nunca regridem. */
  version: z.number().int(),
  createdAt: isoDate,
  updatedAt: isoDate,
  network: networkSchema,
  items: z.array(orderItemSchema),
  subtotal: ethSchema,
  discount: ethSchema,
  networkFee: ethSchema,
  total: ethSchema,
  couponCode: z.string().nullable(),
  wallet: z.object({ id: z.string(), label: z.string(), provider: walletProviderSchema, addressMasked: z.string() }),
  collector: collectorSchema,
  tx: z.object({ hash: z.string(), explorerUrl: z.string(), blockNumber: z.number().int(), confirmedAt: isoDate }).nullable(),
  decline: z.object({ code: z.string(), message: z.string() }).nullable(),
})
export type Order = z.infer<typeof orderSchema>
export const orderListSchema = z.object({ items: z.array(orderSchema) })

// ---------- perfil ----------
export const profileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  bio: z.string(),
  country: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: isoDate,
})
export type Profile = z.infer<typeof profileSchema>

export const profileFormSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome (mín. 2 caracteres)').max(60, 'Máximo de 60 caracteres'),
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo de 3 caracteres')
    .max(24, 'Máximo de 24 caracteres')
    .regex(/^[a-z0-9._]+$/, 'Use apenas letras minúsculas, números, ponto e _'),
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  bio: z.string().max(160, 'Máximo de 160 caracteres'),
  country: z.string().min(2, 'Selecione o país'),
})
export type ProfileForm = z.infer<typeof profileFormSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'A nova senha deve ser diferente da atual' })
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>
/** Corpo enviado à API (sem o campo de confirmação). */
export type ChangePasswordRequest = Pick<ChangePasswordForm, 'currentPassword' | 'newPassword'>

export const avatarResponseSchema = z.object({ avatarUrl: z.string().nullable() })

// ---------- eventos Socket.IO ----------
export const REALTIME_EVENTS = { nftUpdated: 'nft.updated', orderUpdated: 'order.updated' } as const

const eventBase = {
  /** Identidade estável do evento — usada para deduplicar reenvios. */
  id: z.string(),
  /** Versão do recurso afetado — usada para descartar eventos antigos. */
  version: z.number().int(),
  occurredAt: isoDate,
}

export const nftUpdatedEventSchema = z.object({
  ...eventBase,
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  data: z.object({
    editions: z.array(z.object({ id: z.string(), price: ethSchema, available: z.number().int().nonnegative() })),
    priceFrom: ethSchema,
    available: z.number().int().nonnegative(),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  ...eventBase,
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  /** Dono do pedido — o cliente descarta eventos de outro usuário. */
  userId: z.string(),
  data: z.object({ status: orderStatusSchema, order: orderSchema }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent

export const COUNTRIES = [
  { code: 'BR', name: 'Brasil' },
  { code: 'PT', name: 'Portugal' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'AR', name: 'Argentina' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'JP', name: 'Japão' },
] as const
