// El traversal no lo hace ninguna base: lo hace un BFS sobre estos tres Map. Postgres solo
// dumpea la topología con dos SELECT sin joins (PROJECT.md, "Postgres nunca traversa").
// ponytail: la topología entera vive en RAM. El cruce declarado para mover el traversal al
// servidor es ~20-50k nodos; hoy son ~50.

import type { NodoGrafo, VinculoGrafo, Subgrafo } from '@/types/vista'

export interface Adyacencia {
  nodos: ReadonlyMap<string, NodoGrafo>
  /** aristas cuyo `origen` es la clave */
  sale: ReadonlyMap<string, readonly VinculoGrafo[]>
  /** aristas cuyo `destino` es la clave */
  entra: ReadonlyMap<string, readonly VinculoGrafo[]>
}

export function construirAdyacencia(topologia: Subgrafo): Adyacencia {
  const nodos = new Map(topologia.nodos.map((n) => [n.id, n]))
  const sale = new Map<string, VinculoGrafo[]>()
  const entra = new Map<string, VinculoGrafo[]>()

  for (const v of topologia.vinculos) {
    if (!nodos.has(v.origen) || !nodos.has(v.destino)) continue
    const salidas = sale.get(v.origen)
    if (salidas) salidas.push(v)
    else sale.set(v.origen, [v])
    const entradas = entra.get(v.destino)
    if (entradas) entradas.push(v)
    else entra.set(v.destino, [v])
  }

  return { nodos, sale, entra }
}
