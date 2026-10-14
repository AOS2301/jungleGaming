/** Acesso defensivo a localStorage/sessionStorage (modo privado, quota, SSR de ferramentas). */
type Kind = 'local' | 'session'
const area = (kind: Kind): Storage | null => {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readJson<T>(key: string, kind: Kind = 'local'): T | null {
  try {
    const raw = area(kind)?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
export function writeJson(key: string, value: unknown, kind: Kind = 'local'): void {
  try {
    area(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
export function removeKey(key: string, kind: Kind = 'local'): void {
  try {
    area(kind)?.removeItem(key)
  } catch {
    /* ignore */
  }
}
export function removeKeysWhere(predicate: (key: string) => boolean): void {
  for (const kind of ['local', 'session'] as const) {
    const s = area(kind)
    if (!s) continue
    for (const key of Object.keys(s)) if (predicate(key)) s.removeItem(key)
  }
}
