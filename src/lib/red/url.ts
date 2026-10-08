import type { NodeType, Subgrafo, TipoVinculo, Vista, VinculoGrafo } from '../../types/vista.ts'
import type { Adyacencia } from '../vista/adyacencia.ts'
import { resolverVista } from '../vista/resolverVista.ts'
import { fraccionHome } from './home.ts'
import type { IndiceSlugs } from './slugs.ts'

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

// ponytail: techo de la escena = LIMITE_VISTA + LIMITE_SUMA nodos, cada uno un draw call (PERF-01 midió
// ~100 a 30 fps con CPU 4x y 100 ya iba lento en mobile). Salida: bajarlo si el celular cae de 30 fps,
// o pasar a P2 (la base cede lugar a lo sumado).
export const LIMITE_SUMA = 12

// "Sumar con descarte" (D-22): lo nuevo va al final, lo re-tocado pasa a ser lo más reciente y se
// conservan los últimos LIMITE_SUMA; sale lo tocado hace más tiempo.
export const sumarIds = (actual: readonly string[], nuevos: readonly string[]): string[] =>
  [...actual.filter((id) => !nuevos.includes(id)), ...nuevos].slice(-LIMITE_SUMA)

// ENTIDAD llega a 2: nodo -> evento/obra (excluidos por tipo) -> colaboradores, que quedan unidos
// por puentes virtuales (D-puentes) a quien produjo. El resto, a 1.
export const profDefecto = (tipo?: NodeType): number => (tipo === 'ENTIDAD' ? 2 : 1)

// ENTIDAD y AGRUPACION son los únicos tipos con botón "Entrar" (D-ver botones.ts).
// AGRUPACION: entrar muestra solo lo que compone —sus áreas, sus obras— recorriendo los vínculos
// SALIENTES (contenedor -> miembros): el COMPONE que entra al área viene de su dueña (Tropical) y
// recorrerlo en ambas direcciones la traía a profundidad 1; con la raíz fuera de `nodos` quedaba
// flotando sin ningún vínculo dibujable. El orden curatorial entre miembros (PRECEDE) se dibuja igual:
// resolverVista une pares ya visibles, y sin él los miembros quedarían sin ningún vínculo visible.
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

// Identidad completa de un estado (Vista + foco): lo que la cola del puente y el Overlay comparan.
export const claveEstado = (e: EstadoRed): string => claveVista(e) + '|' + (e.enfocado ?? '')

// Por defecto, entrar a una AGRUPACION no muestra el contenedor: estás "adentro", verlo flotando
// junto a sus propios miembros no aporta. Una ENTIDAD sigue viéndose (D-11, el resto de vistaDe).
// `raiz` en la URL pisa el default en cualquier sentido — la Vista queda del todo configurable.
const incluirRaizDefecto = (tipoRed: NodeType | undefined) => tipoRed !== 'AGRUPACION'

export const vistaDe = (e: EstadoRed, redId: string | null, tipoRed?: NodeType): Vista => ({
  raiz: redId,
  profundidad: e.prof ?? profDefecto(tipoRed),
  filtroNodeTypes: tipoRed === 'ENTIDAD' ? TIPOS_AL_ENTRAR_ENTIDAD : [],
  filtroVinculos: soloComponeAlEntrar(tipoRed) ? VINCULOS_AL_ENTRAR : [],
  direccion: soloComponeAlEntrar(tipoRed) ? 'sale' : 'ambas',
  incluirRaiz: e.raiz ?? incluirRaizDefecto(tipoRed),
  limite: LIMITE_VISTA,
  modoOrden: 'grafo',
  // Prendido por defecto (D-puentes): un nodo fuera de la Vista no debería dejar sueltos a los que
  // conectaba. `?puentes=0` lo apaga para comparar, pensando en el panel de opciones de muestra.
  vinculosVirtuales: e.puentes ?? true,
})

// Lo visible para un estado (D-22): la Vista base (la home o la red) más lo sumado al recorrer.
// Criterio G-05: enfocar nunca cambia de red. Lo guardado y el foco que no están en la base se suman
// (el foco va último y nunca sale por el tope), con sus vínculos reales contra lo presente, sin los
// filtros de tipo/vínculo de la base: el colaborador entra con su COLABORO_EN aunque el área filtre
// por COMPONE/PRECEDE. Su red propia solo se ve con "Entrar".
// ponytail: un sumado sin vínculo real a lo visible queda suelto; no hay puentes virtuales para
// sumados ni se recalculan los de la base cuando se suma el nodo que puenteaban. Salida: llamar
// `puentesDe` con los vecinos no visibles de los sumados si el UAT los ve sueltos.
export function subgrafoDe(
  ady: Adyacencia,
  idx: IndiceSlugs,
  estado: EstadoRed,
  guardados: readonly string[],
  { semilla, limiteHome }: { semilla: string; limiteHome: number },
): { sub: Subgrafo; sumados: string[] } {
  const redId = estado.red ? idx.idPorSlug.get(estado.red) ?? null : null
  const base = redId === null
    ? fraccionHome(ady, { semilla, limite: limiteHome })
    : resolverVista(ady, vistaDe(estado, redId, ady.nodos.get(redId)?.nodeType))
  const enBase = new Set(base.nodos.map((n) => n.id))
  const focoId = estado.enfocado ? idx.idPorSlug.get(estado.enfocado) : undefined
  const foco = focoId && ady.nodos.has(focoId) && !enBase.has(focoId) && focoId !== redId ? [focoId] : []
  const sumados = sumarIds(guardados.filter((id) => ady.nodos.has(id) && !enBase.has(id) && id !== redId), foco)

  const nodos = [...base.nodos, ...sumados.map((id) => ady.nodos.get(id)!)]
  const visibles = new Set(nodos.map((n) => n.id))
  const vistos = new Set(base.vinculos.map((v) => v.id))
  const vinculos: VinculoGrafo[] = [...base.vinculos]
  for (const id of sumados) {
    for (const v of [...(ady.sale.get(id) ?? []), ...(ady.entra.get(id) ?? [])]) {
      if (vistos.has(v.id) || !visibles.has(v.origen) || !visibles.has(v.destino)) continue
      vistos.add(v.id)
      vinculos.push(v)
    }
  }
  return { sub: { nodos, vinculos }, sumados }
}
