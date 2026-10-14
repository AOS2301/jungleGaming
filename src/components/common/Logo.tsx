import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lg)" />
      <path d="M8 21c4 1 7-1 8-6 1 5 4 7 8 6-1-5-4-8-8-12-4 4-7 7-8 12Z" fill="#fff" fillOpacity=".95" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 rounded-md', className)} aria-label="Jungle NFT — página inicial">
      <LogoMark />
      <span className="text-lg font-bold tracking-tight">Jungle<span className="text-accent">NFT</span></span>
    </Link>
  )
}
