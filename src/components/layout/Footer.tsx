import { Link } from '@tanstack/react-router'
import { Radio } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { STATUS_LABEL, useConnectionStatus } from '@/realtime/status'
import { cn } from '@/lib/utils'

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

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/60">
      <div className="container-page flex flex-col gap-8 py-10 md:flex-row md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm text-muted">Descubra, colecione e negocie NFTs únicos. Ambiente de demonstração: carteiras, pagamentos e transações são simulados.</p>
          <ConnectionBadge />
        </div>
        <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
          <Link to="/" className="text-muted hover:text-foreground">Marketplace</Link>
          <Link to="/cart" className="text-muted hover:text-foreground">Carrinho</Link>
          <Link to="/profile" className="text-muted hover:text-foreground">Perfil</Link>
          <Link to="/wallets" className="text-muted hover:text-foreground">Carteiras</Link>
        </nav>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">© 2026 Jungle NFT — projeto de demonstração.</div>
    </footer>
  )
}
