import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Formulário de newsletter. Não existe serviço de e-mail nesta demonstração,
 * então ele valida o campo mas avisa que a inscrição não foi feita (nunca finge sucesso).
 */
export function Newsletter() {
  const [message, setMessage] = useState('')

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    setMessage(EMAIL.test(email) ? 'Newsletter indisponível nesta demonstração: nenhum e-mail foi guardado.' : 'Digite um e-mail válido.')
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 lg:border-l lg:border-primary/50 lg:pl-6" aria-label="Receber lançamentos">
      <h3 className="text-sm font-semibold normal-case">Antecipe-se ao próximo lançamento</h3>
      <div className="flex">
        <Input name="email" type="email" aria-label="Newsletter" placeholder="digite seu e-mail..." autoComplete="email" className="h-9 min-w-0 rounded-r-none border-primary/40 bg-surface-2 text-xs md:text-xs" />
        <Button type="submit" size="sm" className="rounded-l-none">Enviar</Button>
      </div>
      <p className="text-xs leading-5 text-accent">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
      <p role="status" className="min-h-4 text-xs text-muted">{message}</p>
    </form>
  )
}
