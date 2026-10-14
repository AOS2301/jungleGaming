import './index.css'

/**
 * Boot em etapas curtas.
 *
 * O HTML já traz um "app shell" estático (hero da página inicial) que é pintado antes de qualquer JS. Aqui:
 *  1. esperamos a primeira pintura — o download do bundle não compete com FCP/LCP;
 *  2. carregamos e iniciamos a camada de mocks (MSW REST + Socket.IO), só quando habilitada por configuração;
 *  3. carregamos a aplicação e a montamos.
 * Entre as etapas devolvemos o controle ao navegador (`yieldToMain`), para que a avaliação dos módulos não
 * vire uma única tarefa longa na thread principal (TBT).
 */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const afterFirstPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

async function boot() {
  await afterFirstPaint()
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { enableMocks } = await import('@/mocks')
    await yieldToMain()
    await enableMocks()
    await yieldToMain()
  }
  // cada vendor é avaliado numa tarefa própria (em vez de uma única tarefa longa)
  await import('react-dom/client')
  await yieldToMain()
  await import('@tanstack/react-router')
  await yieldToMain()
  await import('@radix-ui/react-dialog')
  await yieldToMain()
  const { startApp } = await import('./start')
  await yieldToMain()
  await startApp()
}

void boot()
