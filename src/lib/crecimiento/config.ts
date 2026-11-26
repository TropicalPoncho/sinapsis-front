// Configuración de una estructura que crece con el tiempo (D-52). Es la única parte que vive en la base
// (`metadata.ficha.crecimiento`); la forma no se guarda, se recalcula: estructura = f(semilla, algoritmo, pasos(t)).
// Borde de confianza: llega del jsonb de la base y de la API, así que se valida acá y nunca se confía en su forma.
// Sin imports: lo cargan el import (strip-types), la API, el motor y el panel de debug.

// Lista cerrada. Cambiar una línea de un algoritmo cambia la trayectoria de todos los sitios que lo usan:
// un ajuste es una versión nueva (dendrita-v3) y lo publicado sigue con la suya. dendrita-v1 nunca se publicó (inicio 2026-11-25) y se
// reemplazó por v2 antes de que existiera una sola trayectoria suya en producción.
export const ALGORITMOS = ['dendrita-v2'] as const
export type Algoritmo = (typeof ALGORITMOS)[number]
// Techo de segmentos: ~6000 líneas en un draw call es trivial, pero la generación en un celular no es gratis.
export const SEGMENTOS_MAX = 6000

// Techo de raíces: las dos fundadoras más los participantes que se sumen. Cada raíz tardía trae su nube de atractores (costo de generación).
export const RAICES_MAX = 12

// Una raíz es un nodo del que nace la estructura. `desde` (ISO con zona) es cuándo entra; sin `desde` entra en el paso 0. Las dos primeras
// son las fundadoras (nacen pegadas al núcleo, sin segmento entre ellas) y no llevan `desde`. Hoy solo las fundadoras existen en los datos reales; un
// participante futuro será una ENTIDAD (persona) pública vinculada al evento, y de dónde sale su `desde` se decide en la fase de registro.
export interface RaizConfig {
  id: string
  desde?: string
}

export interface ConfigCrecimiento {
  semilla: number          // entero 0..2^32-1
  algoritmo: Algoritmo
  inicio: string           // ISO 8601 con zona: el paso 0
  fin: string              // ISO 8601 con zona: el paso n
  n: number                // segmentos al terminar, 1..SEGMENTOS_MAX
  raices: RaizConfig[]     // 2..RAICES_MAX; las dos primeras son las fundadoras (x=-r y x=+r del núcleo), el resto entra en `desde`
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/
const ID = /^[\w-]{1,64}$/
const CLAVES = ['semilla', 'algoritmo', 'inicio', 'fin', 'n', 'raices']
const esIso = (v: unknown): v is string => typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(v))
const esObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

export const msDe = (iso: string) => Date.parse(iso)

// Devuelve la config limpia o null; los motivos van a `descartes` (el import falla con ellos, la API solo esconde).
export function validarCrecimiento(x: unknown, descartes?: string[]): ConfigCrecimiento | null {
  const mal = (m: string) => { descartes?.push(`crecimiento: ${m}`); return null }
  if (!esObj(x)) return mal('no es un objeto')
  for (const k of Object.keys(x)) if (!CLAVES.includes(k)) return mal(`clave desconocida "${k}"`)
  const { semilla, algoritmo, inicio, fin, n, raices } = x
  if (!Number.isInteger(semilla) || (semilla as number) < 0 || (semilla as number) > 0xffffffff) return mal('semilla debe ser un entero de 32 bits')
  if (!ALGORITMOS.includes(algoritmo as Algoritmo)) return mal(`algoritmo debe ser uno de ${ALGORITMOS.join(', ')}`)
  for (const [k, v] of [['inicio', inicio], ['fin', fin]] as const) if (!esIso(v)) return mal(`${k} debe ser una fecha ISO 8601 con zona`)
  if (msDe(fin as string) <= msDe(inicio as string)) return mal('fin debe ser posterior a inicio')
  if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > SEGMENTOS_MAX) return mal(`n debe ser un entero de 1 a ${SEGMENTOS_MAX}`)
  if (!Array.isArray(raices) || raices.length < 2 || raices.length > RAICES_MAX) return mal(`raices debe ser una lista de 2 a ${RAICES_MAX} raíces`)
  const limpias: RaizConfig[] = []
  for (let i = 0; i < raices.length; i++) {
    const r: unknown = raices[i]
    if (!esObj(r) || Object.keys(r).some((k) => k !== 'id' && k !== 'desde')) return mal(`raices[${i}] debe ser { id, desde? }`)
    if (typeof r.id !== 'string' || !ID.test(r.id) || limpias.some((l) => l.id === r.id)) return mal(`raices[${i}].id debe ser un id único`)
    if (r.desde !== undefined && !esIso(r.desde)) return mal(`raices[${i}].desde debe ser una fecha ISO 8601 con zona`)
    if (i < 2 && r.desde !== undefined) return mal(`raices[${i}] es fundadora: nace en el paso 0, no lleva desde`)
    limpias.push(r.desde === undefined ? { id: r.id } : { id: r.id, desde: r.desde })
  }
  return { semilla: semilla as number, algoritmo: algoritmo as Algoritmo, inicio: inicio as string, fin: fin as string, n: n as number, raices: limpias }
}
