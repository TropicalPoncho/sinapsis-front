// VIST-04: la topología se pide una sola vez y todas las Vistas se resuelven sobre este índice.
// Explorar la red no dispara ninguna petición.
// ponytail: sin revalidación y sin invalidación. Una edición en la base se ve al recargar la
// página, que es lo correcto para una red curada que cambia poco. El día que haya edición en vivo,
// acá entra un ETag contra /api/topologia (D-19, D-20).

import { construirAdyacencia } from './adyacencia'
import type { Adyacencia } from './adyacencia'
import type { Subgrafo } from '@/types/vista'

let pendiente: Promise<Adyacencia> | undefined

export function cargarAdyacencia(): Promise<Adyacencia> {
  if (!pendiente) {
    pendiente = fetch('/api/topologia')
      .then((res) => {
        if (!res.ok) {
          pendiente = undefined
          throw new Error(`topología: HTTP ${res.status}`)
        }
        return res.json() as Promise<Subgrafo>
      })
      .then(construirAdyacencia)
  }
  return pendiente
}

/** Solo para tests y para el reset entre navegaciones duras. */
export function olvidarTopologia(): void {
  pendiente = undefined
}
