import { estadoDesdeUrl } from './url.ts'

// Historial desplegable (D-51, 261117-nav2): solo PRESENTACIÓN de lo que el navegador ya guarda. La URL sigue siendo la única fuente
// de la Vista; esto no restaura Vistas ni cachea topología, y elegir un paso es `history.go(delta)` (la misma coreografía del Atrás).
// ponytail: tope de pasos visibles; salida, persistirlo por usuario cuando haya cuentas.
export const TOPE_HISTORIAL = 20

export interface Paso { url: string; delta: number }

// Las rutas de la app: la home y las fichas. Una entrada del mismo origen que no sea esto (p. ej. /api/...) no es un destino.
const esDeLaApp = (url: string) => /^\/(?:entidad\/|obra\/|(?:\?|$))/.test(url)

// De la pila de URLs (índice = posición en el historial del navegador) a los pasos hacia atrás, del más reciente al más viejo.
// Salta lo desconocido (`undefined`, p. ej. antes de una recarga cuando no hay Navigation API), lo que no es de la app, la URL
// actual y las repetidas (queda la más cercana). `delta` es negativo: cuántos pasos hay que retroceder.
export function pasosAtras(urls: readonly (string | undefined)[], actual: number, tope = TOPE_HISTORIAL): Paso[] {
  const vistas = new Set<string>([urls[actual] ?? ''])
  const pasos: Paso[] = []
  for (let i = actual - 1; i >= 0 && pasos.length < tope; i--) {
    const url = urls[i]
    if (!url || !esDeLaApp(url) || vistas.has(url)) continue
    vistas.add(url)
    pasos.push({ url, delta: i - actual })
  }
  return pasos
}

// Respaldo sin Navigation API: la pila vive en el Shell, indexada por el `idx` que ya guarda history.state. Navegar descarta lo que
// estaba adelante (igual que el navegador); el resto se conserva.
export const registrar = (urls: readonly (string | undefined)[], idx: number, url: string): (string | undefined)[] => {
  const r = urls.slice(0, idx)
  r[idx] = url
  return r
}

// "Red › Foco", derivado de los datos de la Vista (nombre de la red y del foco); nunca hardcodeado por nodo. `null` si el slug no existe.
export function etiquetaDe(url: string, nombreDe: (slug: string) => string | undefined): string | null {
  const [path, query = ''] = url.split('?')
  const { enfocado, red } = estadoDesdeUrl(path, query)
  if (!enfocado) return red ? nombreDe(red) ?? null : 'Sinápsis'
  const foco = nombreDe(enfocado)
  if (!foco) return null
  const nombreRed = red && red !== enfocado ? nombreDe(red) : undefined
  return nombreRed ? `${nombreRed} › ${foco}` : foco
}
