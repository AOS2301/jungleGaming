import { Link, Outlet } from '@tanstack/react-router'
import { User, Wallet } from 'lucide-react'

const link = 'inline-flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-[15px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground'

export function AccountLayout() {
  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Minha conta</h1>
      <div className="grid items-start gap-8 grid-cols-[minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Conta" className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          <Link to="/profile" className={link} activeProps={{ className: 'bg-surface-2 !text-foreground', 'aria-current': 'page' }}>
            <User className="size-4" aria-hidden /> Perfil
          </Link>
          <Link to="/wallets" className={link} activeProps={{ className: 'bg-surface-2 !text-foreground', 'aria-current': 'page' }}>
            <Wallet className="size-4" aria-hidden /> Carteiras
          </Link>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
