'use client'

import { useEffect, useState } from 'react'
import type { NodoGrafo } from '../types/vista.ts'
import type { DetalleNodo } from '../lib/red/detalle.ts'

// ponytail: hoy los assets salen de public/; cuando lxs creadxrs suban obras pasa a la URL del bucket R2
// y no se reescribe ninguna fila (thumb es clave relativa por invariante).
export const BASE_ASSETS = '/'

const cache = new Map<string, DetalleNodo>()

export function Ficha({ nodo, creditos, hrefDe, onEnfocar }: {
  nodo: NodoGrafo
  creditos: { id: string; nombre: string; rol?: string }[]
  hrefDe: (id: string) => string
  onEnfocar: (id: string) => void
}) {
  const [det, setDet] = useState<DetalleNodo | null>(cache.get(nodo.id) ?? null)

  useEffect(() => {
    if (cache.has(nodo.id)) return
    const ac = new AbortController()
    fetch(`/api/nodo/${nodo.id}`, { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<DetalleNodo>) : {}))
      .then((d) => { cache.set(nodo.id, d); setDet(d) })
      .catch(() => { /* abort o error: se muestran solo los créditos */ })
    return () => ac.abort()
  }, [nodo.id])

  const alClick = (e: React.MouseEvent, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onEnfocar(id)
  }

  return (
    <div className="ficha">
      {creditos.length > 0 && (
        <section>
          <h3 className="ficha__titulo">Créditos</h3>
          <ul className="ficha__creditos">
            {creditos.map((c) => (
              <li key={c.id}>
                <a href={hrefDe(c.id)} onClick={(e) => alClick(e, c.id)}>{c.nombre}</a>
                {c.rol && <> — <span className="ficha__rol">{c.rol}</span></>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {det?.texto && <p className="ficha__texto">{det.texto}</p>}
      {det?.galeria && (
        <section>
          <h3 className="ficha__titulo">Galería</h3>
          <div className="ficha__galeria">
            {det.galeria.map((g) => (
              <img key={g.thumb} src={BASE_ASSETS + g.thumb} alt={g.alt ?? ''} loading="lazy" />
            ))}
          </div>
        </section>
      )}
      {det?.enlaces && (
        <div className="ficha__enlaces">
          {det.enlaces.map((e) => (
            <a key={e.url} className="accion" href={e.url} target="_blank" rel="noopener noreferrer">{e.etiqueta || 'Ir al sitio'}</a>
          ))}
        </div>
      )}
      {det?.youtube && (
        <iframe
          className="ficha__video"
          src={`https://www.youtube-nocookie.com/embed/${det.youtube}`}
          title={`Video de ${nodo.label}`}
          loading="lazy"
          allowFullScreen
        />
      )}
    </div>
  )
}
