import type { NodoGrafo } from '../../types/vista.ts'

export interface IndiceSlugs {
  idPorSlug: Map<string, string>
  slugPorId: Map<string, string>
}

export const slugDe = (label: string): string =>
  label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nodo'

// ponytail: slug derivado del label (D-19); renombrar un nodo cambia su URL.
// Salida: columna `slug` única en migración 002, poblada por el import con esta misma función.
export function indexarSlugs(nodos: readonly NodoGrafo[]): IndiceSlugs {
  const idPorSlug = new Map<string, string>()
  const slugPorId = new Map<string, string>()
  for (const n of [...nodos].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const base = slugDe(n.label)
    let slug = base
    for (let i = 2; idPorSlug.has(slug); i++) slug = `${base}-${i}`
    idPorSlug.set(slug, n.id)
    slugPorId.set(n.id, slug)
  }
  return { idPorSlug, slugPorId }
}

export const rutaDe = (n: NodoGrafo, idx: IndiceSlugs): string =>
  `/${n.nodeType === 'OBRA' || n.nodeType === 'EVENTO' ? 'obra' : 'entidad'}/${idx.slugPorId.get(n.id) ?? slugDe(n.label)}`
