import { AlertTriangle, SearchX, WifiOff, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function StateMessage({
  icon: Icon, title, description, children, className, tone = 'default', role,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  children?: ReactNode
  className?: string
  tone?: 'default' | 'danger'
  role?: 'alert' | 'status'
}) {
  return (
    <div role={role} className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center', className)}>
      <span className={cn('flex size-14 items-center justify-center rounded-full', tone === 'danger' ? 'bg-danger/15 text-danger' : 'bg-surface-2 text-accent')}>
        <Icon className="size-7" aria-hidden />
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="max-w-md text-muted">{description}</p>}
      {children && <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  )
}

export function EmptyState(props: Omit<React.ComponentProps<typeof StateMessage>, 'icon'> & { icon?: LucideIcon }) {
  return <StateMessage icon={SearchX} role="status" {...props} />
}

/** Mensagem amigável + ação de nova tentativa para qualquer erro de consulta. */
export function ErrorState({ error, onRetry, retrying, title, className }: { error: unknown; onRetry?: () => void; retrying?: boolean; title?: string; className?: string }) {
  const err = toApiError(error)
  const offline = err.kind === 'network' || err.kind === 'timeout'
  return (
    <StateMessage
      role="alert"
      tone="danger"
      icon={offline ? WifiOff : AlertTriangle}
      title={title ?? (offline ? 'Sem conexão com o servidor' : 'Algo deu errado')}
      description={err.message}
      className={className}
    >
      {onRetry && (
        <Button onClick={onRetry} loading={retrying}>
          Tentar novamente
        </Button>
      )}
    </StateMessage>
  )
}
