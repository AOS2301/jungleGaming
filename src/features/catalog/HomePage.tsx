import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { CatalogSection } from './CatalogSection'
import { Hero } from './Hero'

export function HomePage() {
  useDocumentTitle()
  return (
    <>
      <Hero />
      <CatalogSection />
    </>
  )
}
