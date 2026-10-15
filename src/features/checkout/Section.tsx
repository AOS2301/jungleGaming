import type { ReactNode } from 'react'

/** Cartão numerado do checkout ("1  Dados do colecionador"). */
export function Section({ number, title, action, children }: { number: number; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`section-${number}`} className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={`section-${number}`} className="flex items-center gap-3 text-xl font-bold">
          <span className="eth flex size-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground" aria-hidden>{number}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
