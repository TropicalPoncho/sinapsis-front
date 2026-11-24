// VIST-04: la topología se pide una sola vez y todas las Vistas se resuelven sobre este índice.
// Explorar la red no dispara ninguna petición.
// ponytail: sin revalidación y sin invalidación. Una edición en la base se ve al recargar la
// página, que es lo correcto para una red curada que cambia poco. El día que haya edición en vivo,
// acá entra un ETag contra /api/topologia (D-19, D-20).

import { construirAdyacencia } from './adyacencia.ts'
import type { Adyacencia } from './adyacencia.ts'
import type { Subgrafo } from '@/types/vista'
import { offsetDeCabeceras } from '../crecimiento/tiempo.ts'

let pendiente: Promise<Adyacencia> | undefined
// Reloj del servidor menos el del cliente (D-52): la estructura que crece depende de la hora y la del visitante puede estar mal.
let offsetServidor = 0
export const ahoraServidor = (): number => Date.now() + offsetServidor

export function cargarAdyacencia(): Promise<Adyacencia> {
  if (!pendiente) {
    pendiente = fetch('/api/topologia')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`topología: HTTP ${res.status}`)
        }
        offsetServidor = offsetDeCabeceras(res.headers.get('date'), res.headers.get('age'), Date.now())
        return res.json() as Promise<Subgrafo>
      })
      .then(construirAdyacencia)
      // Un rechazo (sin red, HTTP no-ok) no se cachea: el próximo llamador reintenta.
      .catch((e) => {
        pendiente = undefined
        throw e
      })
  }
  return pendiente
}

/** Solo para tests y para el reset entre navegaciones duras. */
export function olvidarTopologia(): void {
  pendiente = undefined
}
