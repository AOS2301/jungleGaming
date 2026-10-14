import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="6" fill="#d98a4e" />
      <path d="M10 7v18M10 16l9-9M12.5 14l8.5 11" stroke="#1a0f0a" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/** Marca em texto monoespaçado, como na referência visual. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 rounded-sm', className)} aria-label="Kurio — página inicial">
      <LogoMark className="hidden sm:block" />
      <span className="text-base font-bold uppercase tracking-[0.2em]">Kurio</span>
    </Link>
  )
}
