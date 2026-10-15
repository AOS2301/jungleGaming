import { Link } from '@tanstack/react-router'
import { ShoppingBag } from 'lucide-react'
import { useCartCount } from '@/features/cart/hooks'

/** Ícone do carrinho com a quantidade de itens. */
export function CartButton() {
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
