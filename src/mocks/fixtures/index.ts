import type { CategoryId, NetworkId, WalletProvider, WalletSlot } from '@/api/contracts'
import catalog from './catalog.generated.json'

export interface SeedEdition { id: string; name: string; price: string; total: number; available: number }
export interface SeedNft {
  id: string
  name: string
  description: string
  category: CategoryId
  network: NetworkId
  collectionId: string
  creatorId: string
  featured: boolean
  popularity: number
  createdAt: string
  traits: { label: string; value: string }[]
  editions: SeedEdition[]
  images: { src: string; alt: string }[]
}
export interface SeedCreator { id: string; name: string; handle: string; avatar: string }
export interface SeedCollection { id: string; name: string; category: CategoryId }

export const seedCatalog = catalog as unknown as {
  creators: SeedCreator[]
  collections: SeedCollection[]
  nfts: SeedNft[]
}

// ---------- usuários fictícios ----------
// PBKDF2-SHA256 (50k iterações) das senhas de demonstração; nunca armazenamos senha em claro.
export const PBKDF2_ITERATIONS = 50_000

export interface SeedUser {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  country: string
  avatarUrl: string | null
  salt: string
  passwordHash: string
  createdAt: string
}

export const seedUsers: SeedUser[] = [
  {
    id: 'usr_ana',
    email: 'ana@example.com',
    displayName: 'Ana Souza',
    username: 'ana.souza',
    bio: 'Colecionadora de arte generativa.',
    country: 'BR',
    avatarUrl: '/avatars/ana.svg',
    salt: 'salt-ana-demo',
    passwordHash: '84f70f60737d74dbdb768e3e336a93293ec44496bf15dc5720f93fff4a01e0d8', // Senha@123
    createdAt: '2026-01-05T12:00:00.000Z',
  },
  {
    id: 'usr_bruno',
    email: 'bruno@example.com',
    displayName: 'Bruno Lima',
    username: 'bruno.lima',
    bio: 'Gamer e fã de pixel art.',
    country: 'PT',
    avatarUrl: '/avatars/bruno.svg',
    salt: 'salt-bruno-demo',
    passwordHash: 'c66f23079a13c7dec43074607dd39ec15a3787df62bbfb3d69ed373d4dd98a0a', // Senha@456
    createdAt: '2026-02-11T09:30:00.000Z',
  },
]

export const DEMO_CREDENTIALS = [
  { email: 'ana@example.com', password: 'Senha@123' },
  { email: 'bruno@example.com', password: 'Senha@456' },
] as const

export interface SeedWallet {
  id: string
  userId: string
  slot: WalletSlot
  label: string
  address: string
  provider: WalletProvider
  preferredNetwork: NetworkId
}
export const seedWallets: SeedWallet[] = [
  { id: 'wal_ana_1', userId: 'usr_ana', slot: 'primary', label: 'Carteira principal', address: '0x1111111111111111111111111111111111111aaa', provider: 'metamask', preferredNetwork: 'ethereum' },
  { id: 'wal_ana_2', userId: 'usr_ana', slot: 'secondary', label: 'Carteira de reserva', address: '0x2222222222222222222222222222222222222bbb', provider: 'rabby', preferredNetwork: 'polygon' },
  { id: 'wal_bruno_1', userId: 'usr_bruno', slot: 'primary', label: 'Carteira do Bruno', address: '0x3333333333333333333333333333333333333ccc', provider: 'coinbase', preferredNetwork: 'base' },
]

export const seedFavorites: Record<string, string[]> = {
  usr_ana: ['nft-007'],
  usr_bruno: [],
}

export type CouponSeed =
  | { code: string; type: 'percent'; value: string; label: string; minSubtotal?: string; expiresAt?: string }
  | { code: string; type: 'fixed'; value: string; label: string; minSubtotal?: string; expiresAt?: string }

export const coupons: CouponSeed[] = [
  { code: 'JUNGLE10', type: 'percent', value: '10', label: '10% de desconto' },
  { code: 'WELCOME5', type: 'fixed', value: '0.05', label: '0,05 ETH de desconto', minSubtotal: '0.2' },
  { code: 'MEGA20', type: 'percent', value: '20', label: '20% de desconto (mín. 3 ETH)', minSubtotal: '3' },
  { code: 'EXPIRED20', type: 'percent', value: '20', label: '20% de desconto', expiresAt: '2025-12-31T23:59:59.000Z' },
]
