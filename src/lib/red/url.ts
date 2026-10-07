import type { NodeType, TipoVinculo, Vista } from '../../types/vista.ts'

export interface EstadoRed {
  enfocado: string | null
  red: string | null
  prof: number | null
  semilla: string | null
  raiz: boolean | null
  puentes: boolean | null
}

// Cota PERF-01: tope de nodos por Vista. Con 100 la entrada a Tropical ya iba lenta (cada nodo es
// un draw call y los puentes suman vínculos); 40 sale de esa medición, reajustar con GPU real.
export const LIMITE_VISTA = 40

// ENTIDAD llega a 2: nodo -> evento/obra (excluidos por tipo) -> colaboradores, que quedan unidos
// por puentes virtuales (D-puentes) a quien produjo. El resto, a 1.
export const profDefecto = (tipo?: NodeType): number => (tipo === 'ENTIDAD' ? 2 : 1)

// ENTIDAD y AGRUPACION son los únicos tipos con botón "Entrar" (D-ver botones.ts).
// AGRUPACION: entrar muestra solo lo que compone —sus áreas, sus obras— y el orden curatorial entre
// ellas (PRECEDE: vínculos ENTRE los ya visibles; sin esto, obras sin vínculo a la raíz quedan sin
// ningún vínculo visible y el layout de fuerzas las amontona en el mismo punto).
// ENTIDAD: además se ve con quién hizo cosas. Los eventos y obras que conectan a esa gente quedan
// afuera por tipo (no se muestran) y el puente virtual une a la entidad con sus colaboradores: sin
// recorrer PRODUJO/COLABORO_EN, Tropical Poncho entraba como 5 áreas y ningún creadxr.
const VINCULOS_AL_ENTRAR: TipoVinculo[] = ['COMPONE', 'PRECEDE']
const soloComponeAlEntrar = (tipo: NodeType | undefined) => tipo === 'AGRUPACION'
const TIPOS_AL_ENTRAR_ENTIDAD: NodeType[] = ['ENTIDAD', 'AGRUPACION']

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
  profundidad: e.prof ?? profDefecto(tipoRed),
  filtroNodeTypes: tipoRed === 'ENTIDAD' ? TIPOS_AL_ENTRAR_ENTIDAD : [],
  filtroVinculos: soloComponeAlEntrar(tipoRed) ? VINCULOS_AL_ENTRAR : [],
  direccion: 'ambas',
  incluirRaiz: e.raiz ?? incluirRaizDefecto(tipoRed),
  limite: LIMITE_VISTA,
  modoOrden: 'grafo',
  // Prendido por defecto (D-puentes): un nodo fuera de la Vista no debería dejar sueltos a los que
  // conectaba. `?puentes=0` lo apaga para comparar, pensando en el panel de opciones de muestra.
  vinculosVirtuales: e.puentes ?? true,
})
