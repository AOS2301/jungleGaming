import { Link, useRouter } from '@tanstack/react-router'
import { LogOut, Menu, ShoppingBag, User as UserIcon, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useSession } from '@/features/auth/session'
import { performLogout } from '@/features/auth/session-manager'
import { cn } from '@/lib/utils'

/** Menu lateral (gaveta) para telas menores que lg. */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const router = useRouter()
  const close = () => setOpen(false)
  const item = 'flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium hover:bg-surface-2'
  return (
    <>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={open}>
        <Menu className="size-5" aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent side="right" className="gap-2">
          <DialogTitle>Menu</DialogTitle>
          <DialogDescription className="sr-only">Navegação principal e conta</DialogDescription>
          <nav aria-label="Principal" className="flex flex-col gap-1">
            <Link to="/" className={item} onClick={close}>Início</Link>
            <Link to="/" hash="catalogo" className={item} onClick={close}>Mercado</Link>
            <Link to="/cart" className={item} onClick={close}><ShoppingBag className="size-5" aria-hidden /> Carrinho</Link>
            {user ? (
              <>
                <Link to="/profile" className={item} onClick={close}><UserIcon className="size-5" aria-hidden /> Perfil</Link>
                <Link to="/wallets" className={item} onClick={close}><Wallet className="size-5" aria-hidden /> Carteiras</Link>
                <button type="button" className={cn(item, 'text-left')} onClick={() => { close(); void performLogout() }}>
                  <LogOut className="size-5" aria-hidden /> Sair
                </button>
              </>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <Button asChild variant="outline" onClick={close}>
                  <Link to="/login" search={{ redirect: router.state.location.pathname === '/login' ? undefined : router.state.location.href }}>Entrar</Link>
                </Button>
                <Button asChild onClick={close}>
                  <Link to="/signup">Criar conta</Link>
                </Button>
              </div>
            )}
          </nav>
          {user && <p className="mt-auto truncate border-t border-border pt-4 text-sm text-muted">Conectado como {user.email}</p>}
        </DialogContent>
      </Dialog>
    </>
  )
}
