import { useEffect } from 'react'

const BASE = 'Kurio'

/** Título por rota (SEO e leitores de tela). */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — Marketplace de NFTs`
  }, [title])
}
