import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFavoriteIds, useToggleFavorite } from './hooks'

export function FavoriteButton({ nft, className, withLabel }: { nft: { id: string; name: string }; className?: string; withLabel?: boolean }) {
  const favorites = useFavoriteIds()
  const { toggle } = useToggleFavorite()
  const active = favorites.has(nft.id)
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remover ${nft.name} dos favoritos` : `Adicionar ${nft.name} aos favoritos`}
      onClick={() => toggle(nft, active)}
      data-favorite={active}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/85 text-foreground backdrop-blur transition-colors hover:bg-surface-2',
        withLabel ? 'h-11 px-4 text-sm font-semibold' : 'size-10',
        active && 'border-danger/60 text-danger',
        className,
      )}
    >
      <Heart className={cn('size-5', active && 'fill-current')} aria-hidden />
      {withLabel && <span>{active ? 'Favoritado' : 'Favoritar'}</span>}
    </button>
  )
}
