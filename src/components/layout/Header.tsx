import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { CartButton } from './CartButton'
import { MobileNav } from './MobileNav'
import { UserMenu } from './UserMenu'

const navLink = 'relative -mb-px inline-flex h-[68px] items-center border-b-2 border-transparent px-1 text-[15px] font-medium text-foreground transition-colors hover:text-accent'
const navActive = { className: '!border-primary !text-accent' }

function SearchLink() {
  return (
    <Link to="/" hash="catalogo" className="inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-2" aria-label="Buscar NFTs">
      <Search className="size-5" aria-hidden />
    </Link>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="container-page">
        <div className="relative flex h-[68px] items-center justify-between border-b border-border">
          <Logo />
          <nav aria-label="Principal" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex">
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
