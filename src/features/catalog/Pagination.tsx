import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CatalogSearch } from './search'

function pageWindow(page: number, total: number): (number | 'gap')[] {
  const pages = new Set([1, total, page, page - 1, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('gap')
    out.push(p)
  })
  return out
}

const base = 'inline-flex size-11 items-center justify-center rounded-md border border-border text-sm font-semibold transition-colors hover:bg-surface-2'

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  const to = (p: number) => (prev: CatalogSearch): CatalogSearch => ({ ...prev, page: p > 1 ? p : undefined })
  return (
    <nav aria-label="Paginação do catálogo" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link to="/" search={to(page - 1)} className={base} aria-label="Página anterior" resetScroll={false}>
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(base, 'opacity-40')} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pageWindow(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>…</span>
        ) : (
          <Link
            key={p}
            to="/"
            search={to(p)}
            resetScroll={false}
            aria-label={`Página ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={cn(base, 'eth', p === page && 'border-primary bg-primary text-primary-foreground hover:bg-primary')}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link to="/" search={to(page + 1)} className={base} aria-label="Próxima página" resetScroll={false}>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(base, 'opacity-40')} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  )
}
