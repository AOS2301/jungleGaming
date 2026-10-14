#!/usr/bin/env node
/**
 * Gerador determinístico de fixtures e artes do marketplace.
 *
 * O Figma original não estava acessível durante a implementação, então as artes dos NFTs
 * são geradas proceduralmente (SVG, sem dependências) a partir de uma seed estável.
 * Saídas (versionadas):
 *   - public/nfts/<id>.svg, <id>-2.svg, <id>-3.svg   (galeria de cada NFT)
 *   - public/avatars/*.svg
 *   - src/mocks/fixtures/catalog.generated.json       (catálogo semente do MSW)
 *
 * Uso: npm run generate:assets
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nftDir = join(root, 'public', 'nfts')
const avatarDir = join(root, 'public', 'avatars')
const fixturesFile = join(root, 'src', 'mocks', 'fixtures', 'catalog.generated.json')

rmSync(nftDir, { recursive: true, force: true })
mkdirSync(nftDir, { recursive: true })
mkdirSync(avatarDir, { recursive: true })
mkdirSync(dirname(fixturesFile), { recursive: true })

// ---------- utilidades ----------
function hash(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}
function rng(seed) {
  let a = hash(seed)()
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, list) => list[Math.floor(r() * list.length)]
const between = (r, min, max) => min + r() * (max - min)
const f = (n) => Math.round(n * 10) / 10

// ---------- paletas ----------
const palettes = [
  { name: 'esmeralda e creme', c: ['#0f2a22', '#1f6b4f', '#3fa37a', '#d9c9a3', '#f5ecd5'] },
  { name: 'cobre e grafite', c: ['#1a1311', '#5a3a2a', '#b5703f', '#e8a46c', '#fbe7d0'] },
  { name: 'sálvia e lavanda', c: ['#1b2420', '#5f7f6c', '#a9c4a8', '#9b8cc9', '#efe9fb'] },
  { name: 'âmbar e marrom', c: ['#1c1008', '#6b3e1c', '#c07a34', '#f0b85a', '#fff1d2'] },
  { name: 'azul-petróleo e areia', c: ['#0a2326', '#14646b', '#4fb0a6', '#e2cfa0', '#fbf2da'] },
  { name: 'oliva e mostarda', c: ['#1a1d0b', '#56602a', '#a3b04a', '#e3b93c', '#fff6c9'] },
  { name: 'terracota e menta', c: ['#2a110c', '#a34a2c', '#e0805a', '#8fd1b3', '#e9fbf2'] },
  { name: 'grafite e dourado', c: ['#111114', '#3f3f46', '#a1a1aa', '#eab308', '#fef3c7'] },
  { name: 'violeta e âmbar', c: ['#1b1033', '#6d28d9', '#a78bfa', '#f59e0b', '#fde68a'] },
  { name: 'rosa-antigo e verde', c: ['#2a1119', '#a04565', '#e29aaa', '#6fa88a', '#f0fbf4'] },
]

// ---------- estilos de arte ----------
const S = 800
const wrap = (inner, defs = '', bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img"><defs>${defs}</defs><rect width="${S}" height="${S}" fill="${bg}"/>${inner}</svg>`

function bgGradient(id, p, r) {
  const a = Math.floor(r() * 360)
  return `<linearGradient id="${id}" gradientTransform="rotate(${a} .5 .5)"><stop offset="0" stop-color="${p[0]}"/><stop offset=".6" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient>`
}

function artAbstract(r, p) {
  let defs = bgGradient('bg', p, r) + '<filter id="b"><feGaussianBlur stdDeviation="22"/></filter>'
  let inner = `<rect width="${S}" height="${S}" fill="url(#bg)"/><g filter="url(#b)">`
  const n = 5 + Math.floor(r() * 3)
  for (let i = 0; i < n; i++) {
    inner += `<circle cx="${f(between(r, 80, 720))}" cy="${f(between(r, 80, 720))}" r="${f(between(r, 90, 250))}" fill="${pick(r, p.slice(2))}" opacity="${f(between(r, 0.45, 0.85))}"/>`
  }
  inner += '</g>'
  for (let i = 0; i < 7; i++) {
    const rad = 120 + i * 48
    inner += `<circle cx="400" cy="400" r="${rad}" fill="none" stroke="${p[4]}" stroke-opacity="${f(0.55 - i * 0.07)}" stroke-width="${i % 2 ? 1.5 : 3}" stroke-dasharray="${f(between(r, 4, 80))} ${f(between(r, 10, 60))}"/>`
  }
  return wrap(inner, defs, p[0])
}

function artLandscape(r, p) {
  let defs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset=".7" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[3]}"/></linearGradient><radialGradient id="sun"><stop offset="0" stop-color="${p[4]}"/><stop offset="1" stop-color="${p[3]}" stop-opacity="0"/></radialGradient>`
  let inner = `<rect width="${S}" height="${S}" fill="url(#sky)"/>`
  for (let i = 0; i < 40; i++) inner += `<circle cx="${f(r() * S)}" cy="${f(r() * 380)}" r="${f(between(r, 0.8, 2.2))}" fill="#fff" opacity="${f(between(r, 0.3, 0.9))}"/>`
  const sx = between(r, 200, 600)
  const sy = between(r, 330, 470)
  inner += `<circle cx="${f(sx)}" cy="${f(sy)}" r="230" fill="url(#sun)"/><circle cx="${f(sx)}" cy="${f(sy)}" r="62" fill="${p[4]}"/>`
  const layers = 4
  for (let l = 0; l < layers; l++) {
    const base = 430 + l * 85
    let d = `M0 ${S} L0 ${base}`
    for (let x = 0; x <= S; x += 80) d += ` L${x} ${f(base - between(r, 20, 150 - l * 25))}`
    d += ` L${S} ${S} Z`
    const shade = [p[2], p[1], p[0], p[0]][l]
    inner += `<path d="${d}" fill="${shade}" opacity="${f(0.55 + l * 0.15)}"/>`
  }
  return wrap(inner, defs, p[0])
}

function artMusic(r, p) {
  const defs = bgGradient('bg', [p[0], p[1], p[0]], r) + `<radialGradient id="disc"><stop offset="0" stop-color="${p[3]}"/><stop offset=".2" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[0]}"/></radialGradient>`
  let inner = `<rect width="${S}" height="${S}" fill="url(#bg)"/><circle cx="400" cy="370" r="270" fill="url(#disc)" stroke="${p[2]}" stroke-width="3"/>`
  for (let i = 1; i < 9; i++) inner += `<circle cx="400" cy="370" r="${60 + i * 25}" fill="none" stroke="${p[2]}" stroke-opacity=".35"/>`
  inner += `<circle cx="400" cy="370" r="44" fill="${p[3]}"/><circle cx="400" cy="370" r="8" fill="${p[0]}"/>`
  const bars = 32
  const w = (S - 120) / bars
  for (let i = 0; i < bars; i++) {
    const h = f(between(r, 14, 110))
    inner += `<rect x="${f(60 + i * w + 2)}" y="${f(S - 70 - h)}" width="${f(w - 4)}" height="${h}" rx="3" fill="${i % 4 === 0 ? p[3] : p[2]}"/>`
  }
  return wrap(inner, defs, p[0])
}

function artPixel(r, p) {
  const defs = bgGradient('bg', p, r)
  let inner = `<rect width="${S}" height="${S}" fill="url(#bg)"/>`
  for (let x = 0; x < 20; x++) for (let y = 0; y < 20; y++) if (r() < 0.07) inner += `<rect x="${x * 40}" y="${y * 40}" width="40" height="40" fill="${p[4]}" opacity=".18"/>`
  const n = 10
  const cell = 52
  const ox = (S - n * cell) / 2
  const oy = (S - n * cell) / 2
  const c1 = pick(r, p.slice(2))
  const c2 = pick(r, p.slice(2).filter((c) => c !== c1))
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n / 2; x++) {
      const v = r()
      if (v < 0.52) continue
      const col = v > 0.82 ? c2 : c1
      for (const xx of [x, n - 1 - x]) inner += `<rect x="${ox + xx * cell}" y="${oy + y * cell}" width="${cell}" height="${cell}" fill="${col}" stroke="${p[0]}" stroke-width="3"/>`
    }
  }
  return wrap(inner, defs, p[0])
}

function artCreature(r, p) {
  const defs = bgGradient('bg', p, r)
  const body = pick(r, p.slice(2, 4))
  const accent = p[4]
  let inner = `<rect width="${S}" height="${S}" fill="url(#bg)"/>`
  const kind = Math.floor(r() * 3)
  inner += `<ellipse cx="400" cy="690" rx="210" ry="26" fill="#000" opacity=".25"/>`
  if (kind === 0) {
    inner += `<path d="M230 150 L300 290 L190 300Z M570 150 L500 290 L610 300Z" fill="${body}"/>`
  } else if (kind === 1) {
    inner += `<rect x="285" y="120" width="40" height="150" rx="20" fill="${body}"/><rect x="475" y="120" width="40" height="150" rx="20" fill="${body}"/><circle cx="305" cy="120" r="30" fill="${accent}"/><circle cx="495" cy="120" r="30" fill="${accent}"/>`
  } else {
    inner += `<path d="M400 90 L430 250 L370 250Z" fill="${accent}"/>`
  }
  inner += `<rect x="190" y="230" width="420" height="440" rx="${f(between(r, 90, 200))}" fill="${body}"/>`
  inner += `<ellipse cx="400" cy="560" rx="150" ry="95" fill="${accent}" opacity=".35"/>`
  const eye = f(between(r, 38, 62))
  inner += `<circle cx="318" cy="400" r="${eye}" fill="#fff"/><circle cx="482" cy="400" r="${eye}" fill="#fff"/><circle cx="${f(318 + between(r, -12, 12))}" cy="${f(400 + between(r, -10, 10))}" r="${f(eye / 2.2)}" fill="${p[0]}"/><circle cx="${f(482 + between(r, -12, 12))}" cy="${f(400 + between(r, -10, 10))}" r="${f(eye / 2.2)}" fill="${p[0]}"/>`
  const smile = r() > 0.5
  inner += smile
    ? `<path d="M330 520 Q400 ${f(between(r, 570, 620))} 470 520" stroke="${p[0]}" stroke-width="12" fill="none" stroke-linecap="round"/>`
    : `<rect x="350" y="515" width="100" height="40" rx="20" fill="${p[0]}"/><rect x="372" y="515" width="14" height="18" fill="#fff"/><rect x="414" y="515" width="14" height="18" fill="#fff"/>`
  return wrap(inner, defs, p[0])
}

function artCubes(r, p) {
  const defs = bgGradient('bg', [p[0], p[1], p[0]], r)
  let inner = `<rect width="${S}" height="${S}" fill="url(#bg)"/>`
  const size = 78
  const cubes = []
  for (let gx = -2; gx <= 2; gx++) {
    for (let gy = -2; gy <= 2; gy++) {
      const h = Math.floor(r() * 3.2)
      if (h === 0 && r() > 0.5) continue
      cubes.push({ gx, gy, h: Math.max(1, h) })
    }
  }
  cubes.sort((a, b) => a.gx + a.gy - (b.gx + b.gy))
  const top = pick(r, p.slice(2))
  for (const { gx, gy, h } of cubes) {
    const cx = 400 + (gx - gy) * size
    const cy = 460 + (gx + gy) * (size / 2)
    for (let k = 0; k < h; k++) {
      const y = cy - k * size
      const accent = k === h - 1 && r() > 0.7 ? p[3] : top
      inner += `<polygon points="${cx},${y - size} ${cx + size},${y - size / 2} ${cx},${y} ${cx - size},${y - size / 2}" fill="${accent}"/>`
      inner += `<polygon points="${cx - size},${y - size / 2} ${cx},${y} ${cx},${y + size} ${cx - size},${y + size / 2}" fill="${p[1]}"/>`
      inner += `<polygon points="${cx + size},${y - size / 2} ${cx},${y} ${cx},${y + size} ${cx + size},${y + size / 2}" fill="${p[0]}" opacity=".85"/>`
    }
  }
  return wrap(inner, defs, p[0])
}

const styles = {
  art: { fn: artAbstract, label: 'Composição abstrata' },
  photography: { fn: artLandscape, label: 'Paisagem ao entardecer' },
  music: { fn: artMusic, label: 'Disco de vinil e equalizador' },
  games: { fn: artPixel, label: 'Sprite em pixel art' },
  collectibles: { fn: artCreature, label: 'Criatura colecionável' },
  '3d': { fn: artCubes, label: 'Blocos isométricos em 3D' },
}

// ---------- domínio ----------
const categories = [
  { id: 'art', name: 'Arte' },
  { id: 'photography', name: 'Fotografia' },
  { id: 'music', name: 'Música' },
  { id: 'games', name: 'Games' },
  { id: 'collectibles', name: 'Colecionáveis' },
  { id: '3d', name: '3D' },
]
const networks = ['ethereum', 'polygon', 'arbitrum', 'base']

const creators = [
  { id: 'cr-1', name: 'Lia Moreira', handle: 'lia.moreira' },
  { id: 'cr-2', name: 'Kenji Aoki', handle: 'kenjiaoki' },
  { id: 'cr-3', name: 'Marta Quental', handle: 'mquental' },
  { id: 'cr-4', name: 'Tobias Reis', handle: 'tobias.reis' },
  { id: 'cr-5', name: 'Nadia Farouk', handle: 'nadiaf' },
  { id: 'cr-6', name: 'Otávio Prado', handle: 'otavio.prado' },
  { id: 'cr-7', name: 'Suri Valdés', handle: 'surivaldes' },
  { id: 'cr-8', name: 'Hugo Bernardes', handle: 'hugobern' },
]
const collections = [
  { id: 'col-aurora', name: 'Aurora Series', category: 'art' },
  { id: 'col-prisma', name: 'Prisma Lab', category: 'art' },
  { id: 'col-horizonte', name: 'Horizonte Aberto', category: 'photography' },
  { id: 'col-golden', name: 'Golden Hour', category: 'photography' },
  { id: 'col-vinil', name: 'Vinil Digital', category: 'music' },
  { id: 'col-synth', name: 'Synth Wave Club', category: 'music' },
  { id: 'col-pixel', name: 'Pixel Arena', category: 'games' },
  { id: 'col-quest', name: 'Quest Relics', category: 'games' },
  { id: 'col-bichos', name: 'Bichos do Mangue', category: 'collectibles' },
  { id: 'col-totem', name: 'Totem Friends', category: 'collectibles' },
  { id: 'col-iso', name: 'Isometria', category: '3d' },
  { id: 'col-vox', name: 'Vox Blocks', category: '3d' },
]
const adjectives = ['Neon', 'Sereno', 'Lunar', 'Cobalto', 'Vivo', 'Ártico', 'Solar', 'Etéreo', 'Vibrante', 'Silente', 'Cósmico', 'Dourado', 'Selvagem', 'Líquido', 'Crepuscular']
const nouns = {
  art: ['Delta', 'Maré', 'Miragem', 'Eclipse', 'Orbe', 'Corrente'],
  photography: ['Vale', 'Cume', 'Litoral', 'Névoa', 'Deserto', 'Campo'],
  music: ['Ritmo', 'Compasso', 'Eco', 'Refrão', 'Pulso', 'Acorde'],
  games: ['Guardião', 'Relíquia', 'Arcade', 'Portal', 'Cavaleiro', 'Chip'],
  collectibles: ['Bicho', 'Totem', 'Guaxinim', 'Mascote', 'Espírito', 'Filhote'],
  '3d': ['Bloco', 'Cidade', 'Torre', 'Monólito', 'Cubo', 'Terraço'],
}

const r = rng('jungle-nft-catalog-v1')
const TOTAL = 60
const usedNames = new Set()
const nfts = []

const fmtEth = (milli) => {
  const whole = Math.floor(milli / 1000)
  const frac = String(milli % 1000).padStart(3, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : `${whole}`
}

for (let i = 1; i <= TOTAL; i++) {
  const id = `nft-${String(i).padStart(3, '0')}`
  const col = collections[(i * 5 + Math.floor(r() * 3)) % collections.length]
  const category = col.category
  let name
  do {
    name = `${pick(r, adjectives)} ${pick(r, nouns[category])}`
  } while (usedNames.has(name))
  usedNames.add(name)
  const creator = creators[Math.floor(r() * creators.length)]
  const palette = palettes[Math.floor(r() * palettes.length)]
  const network = networks[Math.floor(r() * networks.length)]
  const baseMilli = pick(r, [60, 85, 120, 150, 220, 340, 480, 750, 1100, 1650, 2400, 3200])
  const nEditions = 1 + Math.floor(r() * 3)
  const editionDefs = [
    { id: 'standard', name: 'Standard', mult: 1, total: 20 + Math.floor(r() * 180) },
    { id: 'rare', name: 'Rare', mult: 1.6, total: 5 + Math.floor(r() * 20) },
    { id: 'legendary', name: 'Legendary', mult: 3.2, total: 1 + Math.floor(r() * 4) },
  ].slice(0, nEditions)
  const editions = editionDefs.map((e) => ({
    id: e.id,
    name: e.name,
    price: fmtEth(Math.round((baseMilli * e.mult) / 5) * 5),
    total: e.total,
    available: Math.max(0, Math.floor(e.total * between(r, 0.1, 0.9))),
  }))
  const image = (n) => (n === 1 ? `/nfts/${id}.svg` : `/nfts/${id}-${n}.svg`)
  const colorAlt = palette.name
  const style = styles[category]
  const images = [1, 2, 3].map((n) => ({
    src: image(n),
    alt: `${style.label} em tons de ${colorAlt} — ${name}${n > 1 ? ` (detalhe ${n - 1})` : ''}`,
  }))
  nfts.push({
    id,
    name,
    description: `${name} é uma obra de ${creator.name} da coleção ${col.name}. ${style.label} em tons de ${colorAlt}, mintada na rede ${network} com certificado de autenticidade simulado.`,
    category,
    network,
    collectionId: col.id,
    creatorId: creator.id,
    featured: false,
    popularity: 20 + Math.floor(r() * 880),
    createdAt: new Date(Date.UTC(2026, 0, 3) + i * 2.3 * 86400000).toISOString(),
    traits: [
      { label: 'Paleta', value: colorAlt },
      { label: 'Estilo', value: style.label },
      { label: 'Rede', value: network },
    ],
    editions,
    images,
    _palette: palette,
    _category: category,
  })
}

// Overrides determinísticos para cenários de teste (disponibilidade, limites, destaques).
const featuredIds = ['nft-001', 'nft-007', 'nft-014', 'nft-022', 'nft-031', 'nft-040']
for (const id of featuredIds) nfts.find((n) => n.id === id).featured = true

const byId = (id) => nfts.find((n) => n.id === id)
// nft-001: dois editions com estoque; preço conhecido
Object.assign(byId('nft-001'), { name: 'Aurora Drift', category: 'art', _category: 'art', network: 'ethereum', collectionId: 'col-aurora', creatorId: 'cr-1' })
byId('nft-001').editions = [
  { id: 'standard', name: 'Standard', price: '0.85', total: 100, available: 12 },
  { id: 'rare', name: 'Rare', price: '1.4', total: 20, available: 4 },
]
// nft-002: uma edição esgotada, outra disponível
byId('nft-002').editions = [
  { id: 'standard', name: 'Standard', price: '0.12', total: 50, available: 9 },
  { id: 'legendary', name: 'Legendary', price: '0.75', total: 3, available: 0 },
]
// nft-003: totalmente esgotado
byId('nft-003').editions = [{ id: 'standard', name: 'Standard', price: '0.3', total: 10, available: 0 }]
// nft-004: apenas uma unidade (limite de quantidade)
byId('nft-004').editions = [{ id: 'standard', name: 'Standard', price: '2.25', total: 5, available: 1 }]
// nft-005: estoque curto (3) e preço com muitas casas decimais
byId('nft-005').editions = [{ id: 'standard', name: 'Standard', price: '0.0125', total: 30, available: 3 }]
// nft-006: preço alto — exercita o cupom com valor mínimo
byId('nft-006').editions = [{ id: 'standard', name: 'Standard', price: '3.5', total: 15, available: 8 }]
// nft-007: destaque, duas edições
byId('nft-007').editions = [
  { id: 'standard', name: 'Standard', price: '0.45', total: 80, available: 30 },
  { id: 'rare', name: 'Rare', price: '0.9', total: 12, available: 6 },
]

// Recalcula textos derivados (descrição, alt, atributos) a partir dos dados finais.
for (const n of nfts) {
  const creator = creators.find((c) => c.id === n.creatorId)
  const col = collections.find((c) => c.id === n.collectionId)
  const style = styles[n._category]
  n.description = `${n.name} é uma obra de ${creator.name} da coleção ${col.name}. ${style.label} em tons de ${n._palette.name}, mintada na rede ${n.network[0].toUpperCase() + n.network.slice(1)} com certificado de autenticidade simulado.`
  n.images = n.images.map((img, idx) => ({ src: img.src, alt: `${style.label} em tons de ${n._palette.name} — ${n.name}${idx > 0 ? ` (detalhe ${idx})` : ''}` }))
  n.traits = [
    { label: 'Paleta', value: n._palette.name },
    { label: 'Estilo', value: style.label },
    { label: 'Rede', value: n.network },
  ]
}

// ---------- escrita das artes ----------
for (const n of nfts) {
  const p = n._palette.c
  const style = styles[n._category].fn
  writeFileSync(join(nftDir, `${n.id}.svg`), style(rng(`${n.id}:1`), p))
  writeFileSync(join(nftDir, `${n.id}-2.svg`), style(rng(`${n.id}:2`), [...p.slice(1), p[0]].map((c, i) => (i === 0 ? p[0] : c))))
  writeFileSync(join(nftDir, `${n.id}-3.svg`), style(rng(`${n.id}:3`), [p[0], p[3], p[2], p[1], p[4]]))
  delete n._palette
  delete n._category
}

// ---------- avatares ----------
const avatarPalettes = [palettes[0], palettes[1], palettes[3], palettes[4], palettes[6], palettes[9], palettes[2], palettes[7]]
function avatarSvg(seed, p, label) {
  const rr = rng(seed)
  const c = p.c
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="${label}"><defs><linearGradient id="g" gradientTransform="rotate(${Math.floor(rr() * 360)} .5 .5)"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[3]}"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/><circle cx="${f(between(rr, 40, 120))}" cy="${f(between(rr, 40, 120))}" r="${f(between(rr, 26, 52))}" fill="${c[4]}" opacity=".55"/><circle cx="80" cy="64" r="26" fill="${c[0]}" opacity=".85"/><path d="M28 160 Q80 84 132 160Z" fill="${c[0]}" opacity=".85"/></svg>`
}
creators.forEach((cr, i) => {
  cr.avatar = `/avatars/${cr.id}.svg`
  writeFileSync(join(avatarDir, `${cr.id}.svg`), avatarSvg(cr.id, avatarPalettes[i % avatarPalettes.length], `Avatar de ${cr.name}`))
})
writeFileSync(join(avatarDir, 'ana.svg'), avatarSvg('ana', palettes[0], 'Avatar de Ana Souza'))
writeFileSync(join(avatarDir, 'bruno.svg'), avatarSvg('bruno', palettes[1], 'Avatar de Bruno Lima'))

// ---------- JSON de fixtures ----------
writeFileSync(fixturesFile, JSON.stringify({ categories, networks, creators, collections, nfts }, null, 2) + '\n')

console.log(`✔ ${nfts.length} NFTs, ${nfts.length * 3} artes, ${creators.length + 2} avatares`)
