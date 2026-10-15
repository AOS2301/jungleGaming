/** Faixa com a marca e os contatos. */
export function ContactStrip() {
  return (
    <div className="grid gap-3 bg-primary/15 px-6 py-5 text-xs md:grid-cols-4 md:items-center lg:px-8">
      <span className="font-bold uppercase tracking-[0.2em]">Kurio</span>
      <span className="text-foreground/90">Feito para colecionadores, criadores e comunidade</span>
      <span className="text-foreground/90">contato@email.com</span>
      <span className="text-foreground/90">+55 11 4002 8922</span>
    </div>
  )
}
