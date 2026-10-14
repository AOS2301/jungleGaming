import { Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dismissCartNotices, useCartNotices } from '@/realtime/notices'

/** Avisos de alteração de preço/disponibilidade recebidos em tempo real enquanto o carrinho está aberto. */
export function CartNotices() {
  const notices = useCartNotices()
  if (notices.length === 0) return null
  return (
    <div role="status" className="mb-6 flex gap-3 rounded-md border border-accent/40 bg-accent/10 p-4" data-testid="cart-notices">
      <Info className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">O carrinho foi atualizado em tempo real</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted">
          {notices.map((n) => (
            <li key={n.id}>{n.message}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">O resumo abaixo já reflete os novos valores.</p>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={dismissCartNotices} aria-label="Dispensar aviso">
        <X aria-hidden />
      </Button>
    </div>
  )
}
