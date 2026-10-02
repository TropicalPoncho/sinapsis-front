import type { NodeType, TipoVinculo, Vista } from '../../types/vista.ts'

export interface EstadoRed {
  enfocado: string | null
  red: string | null
  prof: number | null
  semilla: string | null
  raiz: boolean | null
  puentes: boolean | null
}

// Cota PERF-01: tope de nodos por Vista.
export const LIMITE_VISTA = 100

export const profDefecto = (): number => 1

// ENTIDAD y AGRUPACION son los únicos tipos con botón "Entrar" (D-ver botones.ts): entrar muestra
// solo lo que ese nodo compone —sus áreas, sus obras—, no a quién colaboró. Los colaboradores
// (COLABORO_EN, PRODUJO, INTEGRA) se ven al enfocar el nodo, no al entrar en su red.
// PRECEDE entra acá también: son vínculos ENTRE los ya visibles (obras de una misma área), no
// traen nodos nuevos — sin esto, obras sin vínculo a la raíz quedan sin ningún vínculo visible y
// el layout de fuerzas las amontona todas en el mismo punto.
const VINCULOS_AL_ENTRAR: TipoVinculo[] = ['COMPONE', 'PRECEDE']
const soloComponeAlEntrar = (tipo: NodeType | undefined) => tipo === 'ENTIDAD' || tipo === 'AGRUPACION'

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
  const rz = q.get('raiz')
  const raiz = rz === '0' ? false : rz === '1' ? true : null
  const pt = q.get('puentes')
  const puentes = pt === '0' ? false : pt === '1' ? true : null
  return { enfocado, red, prof, semilla, raiz, puentes }
}

export function urlDe(path: string, e: EstadoRed): string {
  const q = new URLSearchParams()
  if (e.enfocado !== null ? e.red !== e.enfocado : e.red !== null) q.set('red', e.red ?? '_')
  if (e.prof !== null) q.set('prof', String(e.prof))
  if (e.semilla !== null) q.set('semilla', e.semilla)
  if (e.raiz !== null) q.set('raiz', e.raiz ? '1' : '0')
  if (e.puentes !== null) q.set('puentes', e.puentes ? '1' : '0')
  const s = q.toString()
  return s ? `${path}?${s}` : path
}

export const claveVista = (e: EstadoRed): string =>
  `${e.red ?? '_'}|${e.prof ?? ''}|${e.semilla ?? ''}|${e.raiz ?? ''}|${e.puentes ?? ''}`

// Por defecto, entrar a una AGRUPACION no muestra el contenedor: estás "adentro", verlo flotando
// junto a sus propios miembros no aporta. Una ENTIDAD sigue viéndose (D-11, el resto de vistaDe).
// `raiz` en la URL pisa el default en cualquier sentido — la Vista queda del todo configurable.
const incluirRaizDefecto = (tipoRed: NodeType | undefined) => tipoRed !== 'AGRUPACION'

export const vistaDe = (e: EstadoRed, redId: string | null, tipoRed?: NodeType): Vista => ({
  raiz: redId,
  profundidad: e.prof ?? profDefecto(),
  filtroNodeTypes: [],
  filtroVinculos: soloComponeAlEntrar(tipoRed) ? VINCULOS_AL_ENTRAR : [],
  direccion: 'ambas',
  incluirRaiz: e.raiz ?? incluirRaizDefecto(tipoRed),
  limite: LIMITE_VISTA,
  modoOrden: 'grafo',
  // Prendido por defecto (D-puentes): un nodo fuera de la Vista no debería dejar sueltos a los que
  // conectaba. `?puentes=0` lo apaga para comparar, pensando en el panel de opciones de muestra.
  vinculosVirtuales: e.puentes ?? true,
})
