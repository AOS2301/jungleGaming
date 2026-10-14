import { liveMessageStore } from '@/realtime/notices'
import { useStore } from '@/lib/store'

/** Região live global: anuncia mutations e mudanças em tempo real a leitores de tela. */
export function LiveRegion() {
  const { text, seq } = useStore(liveMessageStore)
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
      {/* a chave força o re-anúncio de mensagens idênticas */}
      <span key={seq}>{text}</span>
    </div>
  )
}
