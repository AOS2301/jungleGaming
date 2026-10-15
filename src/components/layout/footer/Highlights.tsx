import { Newsletter } from './Newsletter'

const HIGHLIGHTS = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

/** Faixa de cima do rodapé: três destaques e o formulário de newsletter. */
export function Highlights() {
  return (
    <div className="grid gap-8 p-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:p-8">
      {HIGHLIGHTS.map((item) => (
        <div key={item.letter} className="flex flex-col gap-2 lg:border-l lg:border-primary/50 lg:px-6 lg:first:border-l-0 lg:first:pl-0">
          <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground" aria-hidden="true">
            {item.letter}
          </span>
          <h3 className="text-sm font-semibold normal-case">{item.title}</h3>
          <p className="text-xs leading-5 text-accent">{item.text}</p>
        </div>
      ))}
      <Newsletter />
    </div>
  )
}
