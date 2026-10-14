import { Link, useRouter } from '@tanstack/react-router'
import { LogIn, LogOut, User as UserIcon, Wallet } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession } from '@/features/auth/session'
import { performLogout } from '@/features/auth/session-manager'
import { initials } from '@/lib/format'

/** Desktop: botões "Criar conta/Entrar" para visitantes, menu da conta para quem está logado. */
export function UserMenu() {
  const { user } = useSession()
  const router = useRouter()
  if (!user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
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
        <button type="button" className="hidden items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-surface-2 lg:flex" aria-label={`Menu da conta de ${user.displayName}`}>
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
