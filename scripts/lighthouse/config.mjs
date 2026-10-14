/**
 * Configuração versionada da auditoria Lighthouse.
 * Perfis: mobile (padrão do Lighthouse: Moto G Power emulado, 4G simulado, CPU 4x) e desktop (preset oficial).
 * Nenhuma simplificação específica para a auditoria: o app roda completo (imagens, fontes, mocks, Socket.IO).
 */
export const RUNS_PER_TARGET = 3
export const PORT = 4176
export const PAGES = [
  { id: 'inicio', path: '/' },
  { id: 'detalhe', path: '/nfts/nft-001' },
]
export const PROFILES = ['mobile', 'desktop']
export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
export const THRESHOLDS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
export const CHROME_FLAGS = ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
