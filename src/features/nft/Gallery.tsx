import { useState } from 'react'
import type { Nft } from '@/api/contracts'
import { cn } from '@/lib/utils'

/** Imagem principal + miniaturas clicáveis. */
export function Gallery({ nft }: { nft: Nft }) {
  const [selected, setSelected] = useState(0)
  const main = nft.images[selected] ?? nft.images[0]!

  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-2">
        <img src={main.src} alt={main.alt} width={800} height={800} decoding="async" fetchPriority="high" className="size-full object-cover" />
      </div>
      {nft.images.length > 1 && (
        <ul className="grid grid-cols-4 gap-3" aria-label="Galeria de imagens">
          {nft.images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={i === selected}
                aria-label={`Mostrar imagem ${i + 1} de ${nft.images.length}`}
                className={cn(
                  'block aspect-square w-full overflow-hidden rounded-md border-2 transition-colors',
                  i === selected ? 'border-primary' : 'border-transparent opacity-75 hover:opacity-100',
                )}
              >
                <img src={image.src} alt="" width={200} height={200} loading="lazy" decoding="async" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
