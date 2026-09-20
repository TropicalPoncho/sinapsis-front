import type { NodeType, Transicion } from '../../types/vista.ts'

// ponytail: filtrado inverso como aditivo pierde las posiciones de lo que salió;
// se reasientan por física. Salida: guardar posiciones.
export const inversa: Record<Transicion, Transicion> = {
  reemplazo: 'reemplazo',
  filtrado: 'aditivo',
  aditivo: 'filtrado',
}

export const transicionEntrada = (nodeType: NodeType): Transicion =>
  nodeType === 'AGRUPACION' ? 'reemplazo' : 'filtrado'

export interface Entrada { idx: number; t: Transicion }
export type Direccion = 'push' | 'atras' | 'adelante' | 'dura'

// history.state es entrada foránea: se valida.
export function entradaValida(x: unknown): Entrada | null {
  const s = x && typeof x === 'object' ? (x as { sinapsis?: unknown }).sinapsis : null
  if (!s || typeof s !== 'object') return null
  const { idx, t } = s as { idx?: unknown; t?: unknown }
  if (!Number.isInteger(idx) || (idx as number) < 0) return null
  if (t !== 'reemplazo' && t !== 'filtrado' && t !== 'aditivo') return null
  return { idx: idx as number, t }
}

export function alPop(actual: Entrada | null, nuevo: Entrada | null): { direccion: Direccion; t: Transicion } {
  if (!actual || !nuevo) return { direccion: 'dura', t: 'reemplazo' }
  return nuevo.idx < actual.idx
    ? { direccion: 'atras', t: inversa[actual.t] }
    : { direccion: 'adelante', t: nuevo.t }
}
