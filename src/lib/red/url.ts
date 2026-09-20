import type { NodeType, Vista } from '../../types/vista.ts'

export interface EstadoRed {
  enfocado: string | null
  red: string | null
  prof: number | null
  semilla: string | null
}

// Cota PERF-01: tope de nodos por Vista.
export const LIMITE_VISTA = 100

export const profDefecto = (tipo: NodeType | undefined): number => (tipo === 'ENTIDAD' ? 2 : 1)

export function estadoDesdeUrl(pathname: string, search: string): EstadoRed {
  const [, seg, slug] = pathname.split('/')
  let enfocado: string | null = null
  if ((seg === 'entidad' || seg === 'obra') && slug) {
    try { enfocado = decodeURIComponent(slug) } catch { enfocado = slug }
  }
  const q = new URLSearchParams(search)
  const r = q.get('red')
  const red = r === '_' ? null : r || enfocado
  const p = q.get('prof')
  const n = Number(p)
  const prof = p !== null && p !== '' && Number.isInteger(n) ? Math.min(4, Math.max(1, n)) : null
  const s = q.get('semilla')
  const semilla = s && s.length <= 32 && /^[\w-]+$/.test(s) ? s : null
  return { enfocado, red, prof, semilla }
}

export function urlDe(path: string, e: EstadoRed): string {
  const q = new URLSearchParams()
  if (e.enfocado !== null ? e.red !== e.enfocado : e.red !== null) q.set('red', e.red ?? '_')
  if (e.prof !== null) q.set('prof', String(e.prof))
  if (e.semilla !== null) q.set('semilla', e.semilla)
  const s = q.toString()
  return s ? `${path}?${s}` : path
}

export const claveVista = (e: EstadoRed): string => `${e.red ?? '_'}|${e.prof ?? ''}|${e.semilla ?? ''}`

export const vistaDe = (e: EstadoRed, redId: string | null, tipoRed?: NodeType): Vista => ({
  raiz: redId,
  profundidad: e.prof ?? profDefecto(tipoRed),
  filtroNodeTypes: [],
  filtroVinculos: [],
  direccion: 'ambas',
  incluirRaiz: true,
  limite: LIMITE_VISTA,
  modoOrden: 'grafo',
})
