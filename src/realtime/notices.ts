import { createStore, useStore } from '@/lib/store'

/** Aviso sobre mudança em tempo real de um NFT que está no carrinho do usuário. */
export interface CartNotice {
  /** id do evento que originou o aviso (deduplica) */
  id: string
  nftId: string
  message: string
}

export const cartNoticeStore = createStore<CartNotice[]>([])
export const useCartNotices = () => useStore(cartNoticeStore)
export const pushCartNotice = (notice: CartNotice) =>
  cartNoticeStore.set((prev) => (prev.some((n) => n.id === notice.id) ? prev : [...prev, notice].slice(-5)))
export const dismissCartNotices = () => cartNoticeStore.set([])

/** Mensagem para a região live (leitores de tela). */
export const liveMessageStore = createStore<{ seq: number; text: string }>({ seq: 0, text: '' })
export const announce = (text: string) => liveMessageStore.set((prev) => ({ seq: prev.seq + 1, text }))
