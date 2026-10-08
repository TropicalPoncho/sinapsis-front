import type { NodeType, Transicion } from '../../types/vista.ts'

// ponytail: filtrado inverso como aditivo pierde las posiciones de lo que salió;
// se reasientan por física. Salida: guardar posiciones.
export const inversa: Record<Transicion, Transicion> = {
  reemplazo: 'reemplazo',
  filtrado: 'aditivo',
  aditivo: 'filtrado',
}

// Cambio de D-16 (decisión 2 del UAT): ENTIDAD y AGRUPACION entran con reemplazo. Con filtrado los nodos
// se quedan en su lugar y la cámara solo puede alejarse del enfocado (zoom out); el reemplazo corta bajo el
// negro y permite "zoom in a la neurona, luego zoom in a la red interna". OBRA y EVENTO no tienen Entrar.
// Reversible acá: volver a filtrado para ENTIDAD es esta línea y su test (D-20: el default vive solo en código).
export const transicionEntrada = (nodeType: NodeType): Transicion =>
  nodeType === 'AGRUPACION' || nodeType === 'ENTIDAD' ? 'reemplazo' : 'filtrado'

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
