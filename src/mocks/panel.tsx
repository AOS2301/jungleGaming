/**
 * Painel de controle dos mocks (somente quando VITE_MOCK_CONTROLS=true).
 * Permite escolher o cenário, resetar os dados e disparar eventos Socket.IO a partir do "servidor"
 * simulado. É montado em uma raiz React separada para não depender do router nem do cache da app.
 */
import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ethPercent } from '@/lib/decimal'
import { mockControls } from './controls'

const field = 'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  )
}

function Panel() {
  const presets = mockControls.scenario.presets()
  const [spec, setSpec] = useState(mockControls.scenario.get().spec)
  const [nftId, setNftId] = useState('nft-001')
  const [message, setMessage] = useState('')
  const [lastEvent, setLastEvent] = useState<unknown>(null)
  const [, force] = useState(0)
  const say = (text: string) => {
    setMessage(text)
    force((n) => n + 1)
  }

  const bumpPrice = () => {
    const nft = mockControls.nft.get(nftId)
    if (!nft) return say(`NFT ${nftId} não existe.`)
    const patches = Object.fromEntries(
      nft.editions.map((e) => [e.id, { price: ethPercent(e.price, '110') }]),
    )
    const result = mockControls.nft.update(nftId, patches)
    setLastEvent(result?.event ?? null)
    say(`nft.updated enviado (preço +10%) — versão ${result?.event.version}.`)
  }
  const soldOut = () => {
    const nft = mockControls.nft.get(nftId)
    if (!nft) return say(`NFT ${nftId} não existe.`)
    const result = mockControls.nft.update(nftId, { [nft.editions[0]!.id]: { available: 0 } })
    setLastEvent(result?.event ?? null)
    say(`nft.updated enviado (edição ${nft.editions[0]!.name} esgotada).`)
  }
  const pending = mockControls.orders.list().filter((o) => o.status === 'pending')

  return (
    <div className="flex flex-col gap-5 text-sm">
      <Section title="Cenário">
        <label className="flex flex-col gap-1.5" htmlFor="mock-scenario">
          <span className="font-semibold">Preset (combine com “+”, ex.: slow+payment-declined)</span>
          <input id="mock-scenario" className={field} value={spec} onChange={(e) => setSpec(e.target.value)} list="mock-presets" />
          <datalist id="mock-presets">{presets.map((p) => <option key={p.name} value={p.name} />)}</datalist>
        </label>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { mockControls.scenario.set(spec); say(`Cenário “${spec}” ativo.`) }}>Aplicar cenário</Button>
          <Button size="sm" variant="outline" onClick={() => mockControls.reset({ reload: true })}>Resetar dados</Button>
        </div>
        <details>
          <summary className="cursor-pointer text-muted">Presets disponíveis</summary>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-muted">
            {presets.map((p) => <li key={p.name}><code className="text-accent">{p.name}</code> — {p.description}</li>)}
          </ul>
        </details>
      </Section>

      <Section title="Tempo real (Socket.IO)">
        <label className="flex flex-col gap-1.5" htmlFor="mock-nft">
          <span className="font-semibold">NFT</span>
          <input id="mock-nft" className={field} value={nftId} onChange={(e) => setNftId(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={bumpPrice}>Preço +10%</Button>
          <Button size="sm" variant="secondary" onClick={soldOut}>Esgotar 1ª edição</Button>
          <Button size="sm" variant="outline" disabled={!lastEvent} onClick={() => { mockControls.realtime.emitRaw((lastEvent as { type: string }).type, lastEvent); say('Último evento reenviado (duplicado).') }}>Reenviar duplicado</Button>
          <Button size="sm" variant="outline" onClick={() => say(`${mockControls.realtime.dropConnections()} conexão(ões) derrubada(s).`)}>Derrubar conexão</Button>
          <Button size="sm" variant="outline" onClick={() => { mockControls.realtime.setAvailable(false); say('Servidor recusando conexões.') }}>Indisponibilizar</Button>
          <Button size="sm" variant="outline" onClick={() => { mockControls.realtime.setAvailable(true); say('Servidor aceitando conexões.') }}>Restabelecer</Button>
        </div>
        <p className="text-muted">Conexões ativas: {mockControls.realtime.connectionCount()}</p>
      </Section>

      <Section title="Sessão e pedidos">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { mockControls.session.expire(); say('Sessões expiradas no servidor.') }}>Expirar sessão</Button>
        </div>
        {pending.length === 0 ? <p className="text-muted">Nenhum pedido pendente.</p> : (
          <ul className="flex flex-col gap-2">
            {pending.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2">
                <code className="text-accent">{o.id}</code>
                <Button size="sm" variant="secondary" onClick={() => { mockControls.orders.resolve(o.id, 'confirmed'); say('Pedido confirmado.') }}>Confirmar</Button>
                <Button size="sm" variant="outline" onClick={() => { mockControls.orders.resolve(o.id, 'declined'); say('Pedido recusado.') }}>Recusar</Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <p role="status" aria-live="polite" className="min-h-5 text-accent">{message}</p>
    </div>
  )
}

function Launcher() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="fixed bottom-4 left-4 z-40 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-foreground shadow-lg hover:bg-surface-2"
          data-testid="mock-panel-trigger"
        >
          <FlaskConical className="size-4" aria-hidden /> Mocks
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>Painel de mocks</DialogTitle>
        <DialogDescription>Controle do servidor simulado (MSW): cenários, reset e eventos em tempo real.</DialogDescription>
        <Panel />
      </DialogContent>
    </Dialog>
  )
}

export function mountMockPanel(): void {
  const host = document.createElement('div')
  host.id = 'mock-panel-root'
  document.body.appendChild(host)
  createRoot(host).render(<Launcher />)
}
