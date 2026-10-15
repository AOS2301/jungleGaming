import { Radio } from 'lucide-react'
import { STATUS_LABEL, useConnectionStatus } from '@/realtime/status'
import { cn } from '@/lib/utils'
import { ContactStrip } from './footer/ContactStrip'
import { FooterLinks } from './footer/FooterLinks'
import { Highlights } from './footer/Highlights'

export function ConnectionBadge() {
  const status = useConnectionStatus()
  return (
    <p
      className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold', status === 'connected' ? 'border-success/40 text-success' : 'border-warning/40 text-warning')}
      data-testid="connection-status"
      data-status={status}
    >
      <Radio className="size-3.5" aria-hidden />
      <span>Tempo real: {STATUS_LABEL[status]}</span>
    </p>
  )
}

/** Rodapé em um cartão com três faixas: destaques/newsletter, contatos e links. */
export function Footer() {
  return (
    <footer className="container-page mt-24 pb-8">
      <div className="overflow-hidden rounded-lg bg-surface">
        <Highlights />
        <ContactStrip />
        <FooterLinks />
      </div>
      <div className="mt-5 flex flex-col items-center gap-3 text-center text-xs text-muted">
        <p>© 2026 Kurio. Propriedade digital para todos. Projeto de demonstração.</p>
        <ConnectionBadge />
      </div>
    </footer>
  )
}
