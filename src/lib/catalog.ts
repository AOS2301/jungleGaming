import type { CategoryId, NetworkId, SortId, WalletProvider } from '@/api/contracts'

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  art: 'Arte',
  photography: 'Fotografia',
  music: 'Música',
  games: 'Games',
  collectibles: 'Colecionáveis',
  '3d': '3D',
}

export const NETWORK_LABELS: Record<NetworkId, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  base: 'Base',
}

export const SORT_LABELS: Record<SortId, string> = {
  featured: 'Destaques',
  newest: 'Mais recentes',
  popular: 'Mais populares',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
}

export const PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
  walletconnect: 'WalletConnect',
  rabby: 'Rabby',
}

export const PAGE_SIZE = 12
/** Limite de unidades por linha do carrinho, independente do estoque. */
export const MAX_QTY_PER_LINE = 10
