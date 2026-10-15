import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SocialIcons } from './SocialIcons'

/**
 * Links do rodapé. Só viram link de verdade os que levam a uma tela existente;
 * os outros aparecem como texto simples, para não parecerem funcionais (fora do escopo).
 */
function Soon({ children }: { children: ReactNode }) {
  return <span title="Indisponível nesta demonstração">{children}</span>
}

const linkClass = 'rounded-sm hover:text-foreground'

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold normal-case text-foreground">{title}</h3>
      <ul className="flex flex-col gap-2.5 text-xs text-muted">{children}</ul>
    </div>
  )
}

export function FooterLinks() {
  return (
    <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-6 gap-y-10 p-6 lg:grid-cols-4 lg:p-8">
      <Column title="Meu perfil">
        <li><Link to="/profile" className={linkClass}>Meu perfil</Link></li>
        <li><Soon>Minha coleção</Soon></li>
        <li><Soon>Atividade</Soon></li>
        <li><Soon>Estúdio do criador</Soon></li>
        <li><Soon>Lista de interesse</Soon></li>
      </Column>
      <Column title="Central de ajuda">
        <li><Soon>Central de ajuda</Soon></li>
        <li><Soon>Como comprar NFTs</Soon></li>
        <li><Soon>Carteira e segurança</Soon></li>
        <li><Soon>Política do mercado</Soon></li>
        <li><Soon>Denunciar item</Soon></li>
      </Column>
      <Column title="Coleções">
        <li><Link to="/" search={{ category: 'art' }} className={linkClass}>Arte digital</Link></li>
        <li><Link to="/" search={{ category: 'photography' }} className={linkClass}>Fotografia</Link></li>
        <li><Link to="/" search={{ category: 'music' }} className={linkClass}>Música</Link></li>
        <li><Link to="/" search={{ category: '3d' }} className={linkClass}>Arte 3D</Link></li>
        <li><Soon>Utilidade</Soon></li>
      </Column>
      <div className="flex flex-col gap-8">
        <div>
          <h3 className="mb-4 text-sm font-semibold normal-case text-foreground">Redes sociais</h3>
          <SocialIcons />
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold normal-case text-foreground">Carteiras compatíveis</h3>
          <p className="rounded-sm border border-primary/40 bg-surface-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
            MetaMask · WalletConnect · Coinbase
          </p>
        </div>
      </div>
    </nav>
  )
}
