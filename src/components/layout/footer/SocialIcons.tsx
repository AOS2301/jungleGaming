/** Ícones das redes sociais. Ainda não há perfis reais, então são botões desativados. */
const ICONS = [
  { name: 'Facebook', path: <path d="M13 21v-7h2.5l.5-3h-3V9.5c0-.9.3-1.5 1.6-1.5H16V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.9V11H7.5v3H10v7z" /> },
  {
    name: 'Instagram',
    path: (
      <>
        <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.3" cy="7.7" r="1" />
      </>
    ),
  },
  { name: 'X (Twitter)', path: <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> },
  {
    name: 'LinkedIn',
    path: (
      <>
        <rect x="6" y="10" width="2.6" height="8" />
        <circle cx="7.3" cy="7.3" r="1.5" />
        <path d="M11 10h2.5v1.2c.5-.9 1.5-1.4 2.7-1.4 2.2 0 2.8 1.4 2.8 3.4V18h-2.6v-4.2c0-1-.2-1.8-1.3-1.8s-1.5.8-1.5 1.8V18H11z" />
      </>
    ),
  },
  {
    name: 'YouTube',
    path: (
      <>
        <rect x="4.5" y="7" width="15" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10.5 9.8v4.4l3.8-2.2z" />
      </>
    ),
  },
]

export function SocialIcons() {
  return (
    <ul className="flex flex-wrap gap-2">
      {ICONS.map((icon) => (
        <li key={icon.name}>
          <button
            type="button"
            disabled
            aria-label={`${icon.name} (indisponível nesta demonstração)`}
            title="Indisponível nesta demonstração"
            className="flex size-7 items-center justify-center rounded-sm border border-primary/50 text-accent disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true" focusable="false">
              {icon.path}
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
