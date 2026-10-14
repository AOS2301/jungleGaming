import { Link, useRouter } from '@tanstack/react-router'
import { LogIn, LogOut, Menu, Search, ShoppingBag, User as UserIcon, Wallet } from 'lucide-react'
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

const navLink = 'relative -mb-px inline-flex h-[68px] items-center border-b-2 border-transparent px-1 text-[15px] font-medium text-foreground transition-colors hover:text-accent'
const navActive = { className: '!border-primary !text-accent' }

function SearchLink() {
  return (
    <Link to="/" hash="catalogo" className="inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-2" aria-label="Buscar NFTs">
      <Search className="size-5" aria-hidden />
    </Link>
  )
}

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
          <Link to="/signup">Criar conta</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/login" search={{ redirect: router.state.location.pathname === '/login' ? undefined : router.state.location.href }}><LogIn aria-hidden /> Entrar</Link>
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

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-background/92 backdrop-blur-md">
      <div className="container-page">
        <div className="relative flex h-[68px] items-center justify-between border-b border-border">
          <Logo />
          <nav aria-label="Principal" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">
            <Link to="/" className={navLink} activeProps={navActive} activeOptions={{ exact: true, includeHash: false }}>Início</Link>
            <Link to="/" hash="catalogo" className={navLink}>Mercado</Link>
            <Link to="/wallets" className={navLink} activeProps={navActive}>Carteiras</Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <SearchLink />
            <CartButton />
            <UserMenu />
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
