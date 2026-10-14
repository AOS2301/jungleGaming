#!/usr/bin/env node
/**
 * Auditoria Lighthouse: build de produção (com mocks), preview local, 3 medições por página × perfil.
 * Saídas em reports/lighthouse/: <pagina>-<perfil>-<n>.html|json, summary.json e summary.md (medianas + ambiente).
 * Uso: npm run lighthouse
 */
import { spawn, execSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { CATEGORIES, CHROME_FLAGS, PAGES, PORT, PROFILES, RUNS_PER_TARGET, THRESHOLDS } from './config.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = join(root, 'reports', 'lighthouse')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

console.log('› build de produção (dist-lh)…')
execSync('npx vite build --outDir dist-lh', { cwd: root, stdio: 'inherit' })

console.log(`› preview em http://localhost:${PORT}`)
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-lh', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' })
const base = `http://localhost:${PORT}`
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(base)).ok) break
  } catch {
    /* aguardando */
  }
  await new Promise((r) => setTimeout(r, 500))
}

// LH_ONLY="inicio:mobile" restringe a auditoria (iteração rápida); sem a variável, roda tudo.
const only = process.env.LH_ONLY?.split(',') ?? null
const chromePath = process.env.CHROME_PATH || chromium.executablePath()
const results = []
try {
  for (const page of PAGES) {
    for (const profile of PROFILES) {
      if (only && !only.includes(`${page.id}:${profile}`)) continue
      const runs = []
      for (let n = 1; n <= RUNS_PER_TARGET; n++) {
        // Chrome novo por medição: storage/SW/cache limpos (cenário padrão dos mocks, carga fria)
        const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: CHROME_FLAGS })
        try {
          const flags = { port: chrome.port, output: ['html', 'json'], onlyCategories: CATEGORIES, logLevel: 'error' }
          const result = await lighthouse(base + page.path, flags, profile === 'desktop' ? desktopConfig : undefined)
          const lhr = result.lhr
          const [html, json] = result.report
          const stem = `${page.id}-${profile}-${n}`
          writeFileSync(join(outDir, `${stem}.html`), html)
          writeFileSync(join(outDir, `${stem}.json`), json)
          const run = {
            performance: Math.round(lhr.categories.performance.score * 100),
            accessibility: Math.round(lhr.categories.accessibility.score * 100),
            'best-practices': Math.round(lhr.categories['best-practices'].score * 100),
            seo: Math.round(lhr.categories.seo.score * 100),
            lcp: lhr.audits['largest-contentful-paint'].numericValue,
            cls: lhr.audits['cumulative-layout-shift'].numericValue,
            tbt: lhr.audits['total-blocking-time'].numericValue,
          }
          runs.push(run)
          console.log(`  ${stem}: perf ${run.performance} a11y ${run.accessibility} bp ${run['best-practices']} seo ${run.seo} | LCP ${Math.round(run.lcp)}ms CLS ${run.cls.toFixed(3)} TBT ${Math.round(run.tbt)}ms`)
        } finally {
          await chrome.kill()
        }
      }
      const med = (key) => median(runs.map((r) => r[key]))
      results.push({
        page: page.id,
        path: page.path,
        profile,
        runs,
        median: {
          performance: med('performance'),
          accessibility: med('accessibility'),
          'best-practices': med('best-practices'),
          seo: med('seo'),
          lcpMs: Math.round(med('lcp')),
          cls: Number(med('cls').toFixed(3)),
          tbtMs: Math.round(med('tbt')),
        },
      })
    }
  }
} finally {
  server.kill()
}

const chromeVersion = (() => {
  try {
    return execSync(`"${chromePath}" --version`).toString().trim()
  } catch {
    return 'desconhecida'
  }
})()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const environment = {
  date: new Date().toISOString(),
  node: process.version,
  lighthouse: JSON.parse(readFileSync(join(root, 'node_modules/lighthouse/package.json'), 'utf8')).version,
  chrome: chromeVersion,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: `${os.cpus()[0]?.model ?? 'n/d'} × ${os.cpus().length}`,
  memoryGb: Math.round(os.totalmem() / 1e9),
  app: pkg.name + '@' + pkg.version,
  conditions: 'build de produção (vite build, VITE_ENABLE_MOCKS=true, cenário default), vite preview local, Chrome headless novo por medição (cache/SW/storage limpos), throttling simulado padrão do Lighthouse por perfil',
  runsPerTarget: RUNS_PER_TARGET,
}
writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ environment, thresholds: THRESHOLDS, results }, null, 2))

const row = (r) => {
  const m = r.median
  const mark = (k) => (m[k] >= THRESHOLDS[k] ? '✅' : '❌')
  return `| ${r.page} | ${r.profile} | ${m.performance} ${mark('performance')} | ${m.accessibility} ${mark('accessibility')} | ${m['best-practices']} ${mark('best-practices')} | ${m.seo} ${mark('seo')} | ${m.lcpMs} | ${m.cls} | ${m.tbtMs} |`
}
const md = `# Relatório Lighthouse

Medianas de ${RUNS_PER_TARGET} medições por página e perfil. Metas: Performance ≥ ${THRESHOLDS.performance}, Accessibility ≥ ${THRESHOLDS.accessibility}, Best Practices ≥ ${THRESHOLDS['best-practices']}, SEO ≥ ${THRESHOLDS.seo}.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${results.map(row).join('\n')}

## Ambiente

${Object.entries(environment).map(([k, v]) => `- **${k}**: ${v}`).join('\n')}

Relatórios completos (HTML/JSON) de cada medição estão nesta pasta.
`
writeFileSync(join(outDir, 'summary.md'), md)
console.log('\n' + md)
