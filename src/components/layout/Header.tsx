import { Link, useRouter } from '@tanstack/react-router'
import { LogOut, Menu, ShoppingBag, User as UserIcon, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/common/Logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { performLogout } from '@/features/auth/session-manager'
import { useSession } from '@/features/auth/session'
import { useCartCount } from '@/features/cart/hooks'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

const navLink = 'rounded-md px-3 py-2 text-[15px] font-medium text-muted transition-colors hover:text-foreground'
const navActive = { className: 'text-foreground' }

function CartButton() {
  const count = useCartCount()
  return (
    <Link
      to="/cart"
      className="relative inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-2"
      aria-label={count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 && (
        <span className="eth absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-primary-foreground" aria-hidden>
          {count}
        </span>
      )}
    </Link>
  )
}

function UserMenu() {
  const { user } = useSession()
  const router = useRouter()
  if (!user) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Button asChild variant="ghost" size="sm">
          <Link to="/login" search={{ redirect: router.state.location.pathname === '/login' ? undefined : router.state.location.href }}>Entrar</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/signup">Criar conta</Link>
        </Button>
      </div>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="hidden items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-surface-2 md:flex" aria-label={`Menu da conta de ${user.displayName}`}>
          <Avatar className="size-9">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
          </Avatar>
          <span className="max-w-32 truncate text-sm font-semibold">{user.displayName.split(' ')[0]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/profile"><UserIcon aria-hidden /> Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wallets"><Wallet aria-hidden /> Carteiras</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void performLogout()}>
          <LogOut aria-hidden /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileNav() {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const router = useRouter()
  const close = () => setOpen(false)
  const item = 'flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium hover:bg-surface-2'
  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={open}>
        <Menu className="size-5" aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent side="right" className="gap-2">
          <DialogTitle>Menu</DialogTitle>
          <DialogDescription className="sr-only">Navegação principal e conta</DialogDescription>
          <nav aria-label="Principal" className="flex flex-col gap-1">
            <Link to="/" className={item} onClick={close}>Marketplace</Link>
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

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container-page flex h-[68px] items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            <Link to="/" className={navLink} activeProps={navActive} activeOptions={{ exact: true }}>Marketplace</Link>
            <Link to="/wallets" className={navLink} activeProps={navActive}>Carteiras</Link>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <CartButton />
          <UserMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

