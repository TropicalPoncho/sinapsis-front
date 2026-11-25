// Estructura de una config, generada una vez y revelada hasta el paso actual (D-52). Sin THREE ni React: el motor lee estos arreglos.
import { generar } from './dendrita.ts'
import type { Estructura, NombrePerfil } from './dendrita.ts'
import type { ConfigCrecimiento } from './config.ts'
import { pasoDeIngreso } from './tiempo.ts'

// Pasos de la versión pequeña con que se dibuja el nodo visto desde afuera (misma familia, esfera irregular). Avanza en proporción a
// los pasos de la grande: pasosMini = PASOS_MINI * pasos / n.
export const PASOS_MINI = 400

// algoritmo -> generador. Una versión nueva se agrega acá y la vieja no se toca.
const GENERADORES: Record<ConfigCrecimiento['algoritmo'], typeof generar> = {
  'dendrita-v2': generar,
}

type Entrada = Pick<ConfigCrecimiento, 'algoritmo' | 'semilla' | 'n' | 'inicio' | 'fin' | 'raices'>

// ponytail: una entrada por (config, perfil) y sin tope. Hay a lo sumo un nodo con config por escena y dos perfiles, así que son 1 o 2
// estructuras (~0.2 MB la grande). Con muchos nodos que crecen, un LRU, y la salida real es compartir la geometría (instancing).
const cache = new Map<string, Estructura>()

export function estructuraDe(c: Entrada, perfil: NombrePerfil = 'grande'): Estructura {
  // La mini no tiene raíces tardías: es la forma del nodo visto de lejos, no la estructura del evento.
  const entradas = perfil === 'grande' ? c.raices.map((r) => pasoDeIngreso(c, r.desde)) : [0, 0]
  const n = perfil === 'grande' ? c.n : PASOS_MINI
  const clave = `${c.algoritmo}|${c.semilla}|${perfil}|${n}|${entradas.join(',')}`
  let e = cache.get(clave)
  if (!e) { e = GENERADORES[c.algoritmo](c.semilla, n, perfil, entradas); cache.set(clave, e) }
  return e
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
