// Estructura de una config, generada una vez y revelada hasta el paso actual (D-52). Sin THREE ni React: el motor lee estos arreglos.
import { generar } from './dendrita.ts'
import type { Estructura, NombrePerfil } from './dendrita.ts'
import type { ConfigCrecimiento } from './config.ts'
import { pasoDeIngreso } from './tiempo.ts'

// Pasos de la versión pequeña con que se dibuja el nodo visto desde afuera (misma familia, un solo soma). Avanza en proporción a los
// pasos de la grande (pasosMini), con un piso de dibujo.
export const PASOS_MINI = 400
export const PISO_MINI = 100

// Pasos del mini que se muestran cuando la grande va por `pasos` de `n`: PASOS_MINI * pasos / n, entre PISO_MINI y PASOS_MINI.
// ponytail: PISO_MINI es un piso de dibujo para que el nodo visto desde afuera nunca se vea más chico que un cuarto de su forma (sin él,
// al día 0 no hay nada y el día 1 serían 11 segmentos); el techo es que muestra un cuarto aun antes del inicio. Si el dueño quiere que no
// se vea antes del inicio, el piso pasa a 0.
export function pasosMini(pasos: number, n: number): number {
  const p = (PASOS_MINI * pasos) / n
  return p < PISO_MINI ? PISO_MINI : p > PASOS_MINI ? PASOS_MINI : p
}

// algoritmo -> generador. Una versión nueva se agrega acá y la vieja no se toca.
const GENERADORES: Record<ConfigCrecimiento['algoritmo'], typeof generar> = {
  'dendrita-v2': generar,
}

type Entrada = Pick<ConfigCrecimiento, 'algoritmo' | 'semilla' | 'n' | 'inicio' | 'fin' | 'raices'>

// ponytail: una entrada por (config, perfil) y sin tope. Hay a lo sumo un nodo con config por escena y dos perfiles, así que son 1 o 2
// estructuras (~0.2 MB la grande). Con muchos nodos que crecen, un LRU, y la salida real es compartir la geometría (instancing).
const cache = new Map<string, Estructura>()

export function estructuraDe(c: Entrada, perfil: NombrePerfil = 'grande'): Estructura {
  // La mini es un soma, sin raíces tardías: es la forma del nodo visto de lejos, no la estructura del evento.
  const entradas = perfil === 'grande' ? c.raices.map((r) => pasoDeIngreso(c, r.desde)) : [0]
  const n = perfil === 'grande' ? c.n : PASOS_MINI
  const clave = `${c.algoritmo}|${c.semilla}|${perfil}|${n}|${entradas.join(',')}`
  let e = cache.get(clave)
  if (!e) { e = GENERADORES[c.algoritmo](c.semilla, n, perfil, entradas); cache.set(clave, e) }
  return e
}

// Opacidad por vértice, solo para el dibujo (no decide nada de la forma): con líneas de 1 px no hay grosor, así que el afinado hacia las
// puntas se hace con alfa. Un vértice con muchos descendientes es tronco (pleno); una punta, casi invisible. `padre[v] < v`: una pasada
// hacia atrás cuenta el subárbol. `pleno` = tamaño de subárbol a partir del cual es opaco; `punta` = opacidad de una hoja.
export function opacidades(padre: Int32Array, punta = 0.1, pleno = 60): Float32Array {
  const n = padre.length
  const sub = new Uint32Array(n).fill(1)
  for (let v = n - 1; v > 0; v--) if (padre[v] >= 0) sub[padre[v]] += sub[v]
  const o = new Float32Array(n)
  for (let v = 0; v < n; v++) o[v] = punta + (1 - punta) * Math.min(1, Math.sqrt(sub[v] / pleno))
  return o
}

// Grosor por segmento, solo para el dibujo (no decide nada de la forma, como `opacidades`): 2 si el vértice de donde sale está a menos
// de `cerca` del origen, 1 si a menos de `medio`, 0 si no. Por distancia al cuadrado: sin raíz ni hypot.
export function grosores(e: Pick<Estructura, 'a' | 'pos'>, cerca: number, medio: number): Uint8Array {
  const g = new Uint8Array(e.a.length), c2 = cerca * cerca, m2 = medio * medio
  for (let s = 0; s < e.a.length; s++) {
    const v = 3 * e.a[s], d = e.pos[v] * e.pos[v] + e.pos[v + 1] * e.pos[v + 1] + e.pos[v + 2] * e.pos[v + 2]
    g[s] = d < c2 ? 2 : d < m2 ? 1 : 0
  }
  return g
}

// Cuántos segmentos tienen paso <= k (paso[] no decrece): búsqueda binaria.
export function segmentosHasta(e: Pick<Estructura, 'paso'>, k: number): number {
  let lo = 0, hi = e.paso.length
  while (lo < hi) { const m = (lo + hi) >>> 1; if (e.paso[m] <= k) lo = m + 1; else hi = m }
  return lo
}

// Lo que existe cuando están completos los primeros k pasos: vistas (sin copia) de los mismos arreglos. k se acota a [0, pasos].
export function hastaPaso(e: Estructura, k: number) {
  const p = Math.max(0, Math.min(e.pasos, Math.floor(k)))
  const s = segmentosHasta(e, p)
  return { segmentos: s, a: e.a.subarray(0, s), b: e.b.subarray(0, s), paso: e.paso.subarray(0, s), pos: e.pos.subarray(0, 3 * e.vertices[p]), padre: e.padre.subarray(0, e.vertices[p]) }
}
