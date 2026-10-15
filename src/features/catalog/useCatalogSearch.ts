import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { CatalogSearch } from './search'

const route = getRouteApi('/')

/**
 * Estado do catálogo = URL. Este hook lê os parâmetros e expõe as ações que os alteram:
 *  - `update`: muda filtros/ordenação e volta para a página 1;
 *  - `clearAll`: remove busca e filtros (mantém a ordenação);
 *  - `searchText`: texto do campo de busca, com debounce antes de ir para a URL.
 */
export function useCatalogSearch() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const update = (patch: Partial<CatalogSearch>) => {
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), resetScroll: false })
  }

  // --- campo de busca ---
  const [text, setText] = useState(search.q ?? '')
  const lastSentToUrl = useRef(search.q ?? '')
  const debouncedText = useDebouncedValue(text, 350)

  // Digitou: depois de 350 ms, grava na URL (replace: não enche o histórico).
  useEffect(() => {
    const q = debouncedText.trim()
    if (q === lastSentToUrl.current) return
    lastSentToUrl.current = q
    void navigate({ search: (prev) => ({ ...prev, q: q || undefined, page: undefined }), replace: true, resetScroll: false })
  }, [debouncedText, navigate])

  // A URL mudou por fora (botão voltar, link): atualiza o campo.
  useEffect(() => {
    const q = search.q ?? ''
    if (q !== lastSentToUrl.current) {
      lastSentToUrl.current = q
      setText(q)
    }
  }, [search.q])

  const clearAll = () => {
    lastSentToUrl.current = ''
    setText('')
    void navigate({ search: (prev: CatalogSearch) => ({ sort: prev.sort }), resetScroll: false })
  }

  return { search, update, clearAll, searchText: text, setSearchText: setText }
}
