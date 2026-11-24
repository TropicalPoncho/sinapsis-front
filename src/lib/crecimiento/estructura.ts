// Estructura de una config, generada una vez y revelada hasta el paso actual (D-52). Sin THREE ni React: el motor lee estos arreglos.
import { generar } from './dendrita.ts'
import type { Estructura } from './dendrita.ts'
import type { ConfigCrecimiento } from './config.ts'

// algoritmo -> generador. Una versión nueva se agrega acá y la vieja no se toca.
const GENERADORES: Record<ConfigCrecimiento['algoritmo'], (semilla: number, n: number) => Estructura> = {
  'dendrita-v1': generar,
}

// ponytail: una sola entrada en caché (hay una estructura a la vez en pantalla). Con más de una por escena, un Map por clave.
let ultima: { clave: string; estructura: Estructura } | null = null

export function estructuraDe(c: Pick<ConfigCrecimiento, 'algoritmo' | 'semilla' | 'n'>): Estructura {
  const clave = `${c.algoritmo}|${c.semilla}|${c.n}`
  if (ultima?.clave !== clave) ultima = { clave, estructura: GENERADORES[c.algoritmo](c.semilla, c.n) }
  return ultima.estructura
}

// Lo que existe cuando están completos los primeros k pasos: vistas (sin copia) de los mismos arreglos. k se acota a [0, segmentos].
export function hastaPaso(e: Estructura, k: number) {
  const s = Math.max(0, Math.min(e.a.length, Math.floor(k)))
  return { segmentos: s, a: e.a.subarray(0, s), b: e.b.subarray(0, s), paso: e.paso.subarray(0, s), pos: e.pos.subarray(0, 3 * e.vertices[s]), padre: e.padre.subarray(0, e.vertices[s]) }
}
