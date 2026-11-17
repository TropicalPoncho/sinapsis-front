'use client'

import { useEffect, useState } from 'react'
import type { NodoGrafo } from '../types/vista.ts'
import type { DetalleNodo } from '../lib/red/detalle.ts'
import type { Seccion } from '../lib/red/menus.ts'
import { HEX } from './Menus.tsx'

// ponytail: hoy los assets salen de public/; cuando lxs creadxrs suban obras pasa a la URL del bucket R2
// y no se reescribe ninguna fila (thumb es clave relativa por invariante).
export const BASE_ASSETS = '/'

const cache = new Map<string, DetalleNodo>()

// D-50 (261117-nav1): la ficha ya no es una capa. Es el CONTENIDO de la expansión inline: Overlay lo monta debajo de los botones del
// panel (título, tipo/fecha, bajada y botones se quedan donde están) y el panel scrollea por dentro. Estado de UI, no Vista (D-34).
export function Ficha({ nodo, secciones, futuro, nodos, hrefDe, onMiembro }: {
  nodo: NodoGrafo
  secciones: Seccion[]
  // D-44: evento de hoy en adelante (lo decide Overlay, en el cliente): muestra el llamado a entradas.
  futuro: boolean
  nodos: ReadonlyMap<string, NodoGrafo>
  hrefDe: (id: string) => string
  onMiembro: (seccionId: string, id: string) => void
}) {
  const [det, setDet] = useState<DetalleNodo | null>(cache.get(nodo.id) ?? null)
  const bloques = det?.bloques ?? []

  useEffect(() => {
    if (cache.has(nodo.id)) return
    const ac = new AbortController()
    fetch(`/api/nodo/${nodo.id}`, { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<DetalleNodo>) : { bloques: [] }))
      .then((d) => { cache.set(nodo.id, d); setDet(d) })
      .catch(() => { /* abort o error: se muestran solo los créditos */ })
    return () => ac.abort()
  }, [nodo.id])

  const alClick = (e: React.MouseEvent, seccionId: string, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onMiembro(seccionId, id)
  }

  const entidad = nodo.nodeType === 'ENTIDAD'
  const titulo = entidad ? 'Portfolio' : 'Créditos'
  const item = (s: Seccion, m: Seccion['nodos'][number]) => {
    const n = nodos.get(m.id)
    return n && (
      <li key={m.id}>
        <a href={hrefDe(m.id)} onClick={(e) => alClick(e, s.id, m.id)}>{n.label}</a>
        {m.rol && <span className="desplegable__rol">{m.rol}</span>}
      </li>
    )
  }
  return (
    <>
      {futuro && det?.entradas && (
        <section className="desplegable__entradas" aria-labelledby="entradas-t">
          <h3 id="entradas-t" className="desplegable__titulo">Entradas</h3>
          {det.entradas.texto && <p className="desplegable__texto">{det.entradas.texto}</p>}
          {/* Sinápsis no vende ni cobra (D-44): el llamado es texto y un enlace a quien vende, sin datos de pago ni personales. */}
          {det.entradas.url && <a className="accion" href={det.entradas.url} target="_blank" rel="noopener noreferrer">{det.entradas.etiqueta ?? 'Conseguir entradas'}</a>}
        </section>
      )}

      {bloques.map((b) => (
        <section key={b.id} className="desplegable__bloque" aria-labelledby={'bloque-' + b.id + '-t'}>
          <h3 id={'bloque-' + b.id + '-t'} className="desplegable__titulo">{b.nombre}</h3>
          {b.tipo === 'texto' && <p className="desplegable__texto">{b.texto}</p>}
          {b.tipo === 'galeria' && (
            <div className="desplegable__galeria">
              {b.imagenes.map((g) => (
                <img key={g.thumb} src={BASE_ASSETS + g.thumb} alt={g.alt ?? ''} loading="lazy" />
              ))}
            </div>
          )}
          {b.tipo === 'enlaces' && (
            <div className="desplegable__enlaces">
              {b.enlaces.map((e) => (
                <a key={e.url} className="accion" href={e.url} target="_blank" rel="noopener noreferrer">{e.etiqueta}</a>
              ))}
            </div>
          )}
          {b.tipo === 'video' && (
            <iframe
              className="desplegable__video"
              src={`https://www.youtube-nocookie.com/embed/${b.youtube}`}
              title={`${b.nombre} de ${nodo.label}`}
              loading="lazy"
              allowFullScreen
            />
          )}
        </section>
      ))}

      {/* D-39: los créditos son la misma agrupación por rol de siempre (seccionesDe). Cada nombre entra a esa sección (D-37). */}
      {secciones.length > 0 && (
        <section className="desplegable__creditos" aria-label={titulo + ' de ' + nodo.label}>
          <h3 className="desplegable__titulo">{titulo}</h3>
          {secciones.map((s) => (
            <div key={s.id} className="desplegable__grupo" role="group" aria-labelledby={'credito-' + s.id}>
              <h4 id={'credito-' + s.id} className="desplegable__grupo-titulo" style={HEX.test(s.color) ? { color: s.color } : undefined}>{s.label}</h4>
              {/* D-47 / 261029-hui: los primeros `proximos` son eventos de hoy en adelante, bajo "Próximos"; el resto, bajo "Pasados"
                  (que solo existe si hay próximos: sin ninguno, lista plana). */}
              {s.proximos && <p className="desplegable__sub desplegable__sub--proximos">Próximos</p>}
              {s.proximos && <ul className="desplegable__nodos">{s.nodos.slice(0, s.proximos).map((m) => item(s, m))}</ul>}
              {s.proximos && s.nodos.length > s.proximos && <p className="desplegable__sub">Pasados</p>}
              {s.nodos.length > (s.proximos ?? 0) && <ul className="desplegable__nodos">{s.nodos.slice(s.proximos ?? 0).map((m) => item(s, m))}</ul>}
            </div>
          ))}
        </section>
      )}
    </>
  )
}
