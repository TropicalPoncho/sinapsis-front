// El tiempo de la estructura (D-52): pasos(t) = n * suave((t - inicio) / (fin - inicio)). Monótono en t, sin estado.
// Solo `+ - * /` y comparaciones: lo que decide cuánto creció no depende del motor de números de cada navegador.
import { msDe } from './config.ts'
import type { ConfigCrecimiento } from './config.ts'

const DIA_MS = 86400000

// Lenta al principio y al final, sin saltos: smoothstep. Monótona en [0,1], suave(0)=0, suave(1)=1.
export const suave = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

// Pasos en el instante `ms`, con fracción: floor = segmentos completos, resto = cuánto lleva el que está naciendo.
export function pasosEn(c: Pick<ConfigCrecimiento, 'inicio' | 'fin' | 'n'>, ms: number): number {
  const i = msDe(c.inicio)
  return c.n * suave((ms - i) / (msDe(c.fin) - i))
}

// Perillas de desarrollo (no son estado ni se comparten): ver cualquier momento sin esperar.
//   ?t=2026-12-01T12:00:00-03:00  un instante ISO     ?dia=3.5  días desde el inicio
// `fraccion` (0..1 del recorrido) es la del slider del panel de debug. Gana fraccion, después t, después dia.
export interface Perillas { t?: number; dia?: number; fraccion?: number }

export function perillasDe(search: string): Perillas {
  const p = new URLSearchParams(search)
  const t = p.has('t') ? Date.parse(p.get('t')!) : NaN
  const dia = p.has('dia') && p.get('dia') !== '' ? Number(p.get('dia')) : NaN
  return { ...(!Number.isNaN(t) && { t }), ...(Number.isFinite(dia) && { dia }) }
}

export function tiempoDe(c: Pick<ConfigCrecimiento, 'inicio' | 'fin'>, perillas: Perillas, ahoraMs: number): number {
  const i = msDe(c.inicio)
  if (perillas.fraccion !== undefined) return i + perillas.fraccion * (msDe(c.fin) - i)
  if (perillas.t !== undefined) return perillas.t
  if (perillas.dia !== undefined) return i + perillas.dia * DIA_MS
  return ahoraMs
}

// Offset del reloj del servidor respecto del del cliente, de las cabeceras de la respuesta de /api/topologia. El paso depende de la
// hora y la hora del visitante puede estar mal: se usa la del servidor. `Date` tiene resolución de 1 s (sobra: un paso son minutos).
// ponytail: no descuenta la latencia de la respuesta (decenas de ms) y, si un CDN sirve la respuesta cacheada, `Age` corrige solo
// lo que el CDN declare; la ruta es force-dynamic. Si el reloj llega a importar al segundo, entra un endpoint /api/hora.
export function offsetDeCabeceras(date: string | null, age: string | null, ahoraCliente: number): number {
  const d = date ? Date.parse(date) : NaN
  if (Number.isNaN(d)) return 0
  const a = age && Number.isFinite(Number(age)) ? Number(age) * 1000 : 0
  return d + a - ahoraCliente
}
