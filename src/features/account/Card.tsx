import type { ReactNode } from 'react'

/** Cartão com título e descrição, usado nas seções do perfil. */
export function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/\W+/g, '-')
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-surface p-5 sm:p-7">
      <h2 id={id} className="text-xl font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}
