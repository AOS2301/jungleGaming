import { Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { StateMessage } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada')
  return (
    <div className="container-page py-16">
      <StateMessage icon={Compass} title="Página não encontrada" description="O endereço que você tentou acessar não existe ou foi movido.">
        <Button asChild><Link to="/">Ir para o marketplace</Link></Button>
        <Button asChild variant="outline"><Link to="/cart">Ver carrinho</Link></Button>
      </StateMessage>
    </div>
  )
}

export function RouteError({ error, reset }: { error: unknown; reset: () => void }) {
  const message = error instanceof Error ? error.message : 'Erro inesperado.'
  return (
    <div className="container-page py-16">
      <StateMessage role="alert" tone="danger" icon={Compass} title="Algo deu errado nesta página" description={message}>
        <Button onClick={reset}>Tentar novamente</Button>
        <Button asChild variant="outline"><Link to="/">Ir para o início</Link></Button>
      </StateMessage>
    </div>
  )
}

export function AppLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Carregando aplicação">
      <div className="size-10 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  )
}
