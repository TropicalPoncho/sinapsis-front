'use client'

import { useEffect, useRef, useState } from 'react'
import type { NodoGrafo } from '../types/vista.ts'
import type { DetalleNodo } from '../lib/red/detalle.ts'
import type { Seccion } from '../lib/red/menus.ts'
import { fechaLarga } from '../lib/red/fechas.ts'
import { HEX } from './Menus.tsx'

// ponytail: hoy los assets salen de public/; cuando lxs creadxrs suban obras pasa a la URL del bucket R2
// y no se reescribe ninguna fila (thumb es clave relativa por invariante).
export const BASE_ASSETS = '/'

const cache = new Map<string, DetalleNodo>()

// D-27: la capa expandida (variante A). Va por encima de todo el canvas y no mueve la cámara: el panel sigue
// maquetado debajo. Estado de UI, no Vista: no toca la URL ni el historial (D-34).

export function Ficha({ nodo, secciones, futuro, espacio, nodos, hrefDe, onMiembro, onCerrar }: {
  nodo: NodoGrafo
  secciones: Seccion[]
  // D-44: evento de hoy en adelante (lo decide Overlay, en el cliente) y su lugar, de la sección "lugar".
  futuro: boolean
  espacio?: { id: string; seccion: string }
  nodos: ReadonlyMap<string, NodoGrafo>
  hrefDe: (id: string) => string
  onMiembro: (seccionId: string, id: string) => void
  onCerrar: () => void
}) {
  const [det, setDet] = useState<DetalleNodo | null>(cache.get(nodo.id) ?? null)
  const capaRef = useRef<HTMLElement>(null)
  const nombreRef = useRef<HTMLHeadingElement>(null)
  const [activa, setActiva] = useState<string>()
  const bloques = det?.bloques ?? []
  const cuantos = bloques.length

  useEffect(() => { nombreRef.current?.focus({ preventScroll: true }) }, [])
  // Scroll-spy (D-27, D-38): activa es el último bloque cuyo borde superior ya pasó la línea bajo la cabecera. El observer solo avisa
  // cuándo un borde cruza esa franja de 40px; el bloque se decide midiendo, así volver arriba deja el primero. Los bloques llegan por
  // fetch, después de montar: el efecto depende de cuántos son. Con menos de dos no hay menú y no corre.
  // ponytail: la franja se calcula al montar; rotar el celular con la ficha abierta la deja desfasada hasta reabrirla.
  useEffect(() => {
    const capa = capaRef.current
    const alto = capa?.querySelector('.expandido__cabecera')?.getBoundingClientRect().height
    if (!capa || !alto || cuantos < 2) return
    const els = [...capa.querySelectorAll<HTMLElement>('.expandido__contenido')]
    const linea = alto + 56
    const io = new IntersectionObserver(
      () => setActiva((els.filter((e) => e.getBoundingClientRect().top <= linea).pop() ?? els[0])?.id.slice('bloque-'.length)),
      { root: capa, rootMargin: `-${alto + 16}px 0px -${Math.max(0, capa.clientHeight - linea)}px 0px` },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [nodo.id, cuantos])
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
  // Sin `href="#…"`: cambiaría el hash y sumaría una entrada al historial.
  const irA = (id: string) => document.getElementById('bloque-' + id)?.scrollIntoView({ block: 'start' })

  // aria-modal: el foco no sale de la capa (el resto del overlay está `inert`, pero también existen el panel de debug y el navegador).
  const alTeclado = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !capaRef.current) return
    const f = [...capaRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')]
    if (!f.length) return
    const sale = e.shiftKey ? document.activeElement === f[0] || document.activeElement === nombreRef.current : document.activeElement === f[f.length - 1]
    if (!sale) return
    e.preventDefault()
    f[e.shiftKey ? f.length - 1 : 0].focus()
  }

  const fecha = fechaLarga(nodo.fecha)
  return (
    <section ref={capaRef} className="expandido" role="dialog" aria-modal="true" aria-labelledby="expandido-nombre" onKeyDown={alTeclado}>
      <header className="expandido__cabecera">
        <h2 id="expandido-nombre" className="expandido__nombre" tabIndex={-1} ref={nombreRef}>{nodo.label}</h2>
        {cuantos >= 2 && (
          <nav className="expandido__menu" aria-label={'Secciones de ' + nodo.label}>
            {bloques.map((b) => (
              <button
                key={b.id}
                type="button"
                className="expandido__item"
                aria-current={b.id === (activa ?? bloques[0].id) ? 'true' : undefined}
                style={b.id === (activa ?? bloques[0].id) && HEX.test(nodo.vizParams.color) ? { color: nodo.vizParams.color } : undefined}
                onClick={() => irA(b.id)}
              >
                {b.nombre}
              </button>
            ))}
          </nav>
        )}
        <button type="button" className="accion accion--volver expandido__volver" onClick={onCerrar}>Volver</button>
      </header>

      <div className="expandido__portada">
        <div className="expandido__columna">
          <p className="expandido__tipo">{nodo.subtipo}{!futuro && fecha && ` · ${fecha}`}</p>
          {futuro && <p className="expandido__cuando">{fechaLarga(nodo.fecha, true)}{nodo.horario && ` · ${nodo.horario}`}</p>}
          {futuro && espacio && nodos.get(espacio.id) && (
            <p className="expandido__lugar"><a href={hrefDe(espacio.id)} onClick={(e) => alClick(e, espacio.seccion, espacio.id)}>{nodos.get(espacio.id)!.label}</a></p>
          )}
          {nodo.descripcionBreve && <p className="expandido__bajada">{nodo.descripcionBreve}</p>}
          {futuro && det?.entradas && (
            <section className="expandido__entradas" aria-labelledby="entradas-t">
              <h3 id="entradas-t" className="expandido__titulo">Entradas</h3>
              {det.entradas.texto && <p className="expandido__texto">{det.entradas.texto}</p>}
              {/* Sinápsis no vende ni cobra (D-44): el llamado es texto y un enlace a quien vende, sin datos de pago ni personales. */}
              {det.entradas.url && <a className="accion" href={det.entradas.url} target="_blank" rel="noopener noreferrer">{det.entradas.etiqueta ?? 'Conseguir entradas'}</a>}
            </section>
          )}
        </div>
      </div>

      <div className="expandido__bloque">
        <div className="expandido__cuerpo">
          <div className="expandido__columna">
            {bloques.map((b) => (
              <section key={b.id} id={'bloque-' + b.id} className="expandido__contenido" aria-labelledby={'bloque-' + b.id + '-t'}>
                <h3 id={'bloque-' + b.id + '-t'} className="expandido__titulo">{b.nombre}</h3>
                {b.tipo === 'texto' && <p className="expandido__texto">{b.texto}</p>}
                {b.tipo === 'galeria' && (
                  <div className="expandido__galeria">
                    {b.imagenes.map((g) => (
                      <img key={g.thumb} src={BASE_ASSETS + g.thumb} alt={g.alt ?? ''} loading="lazy" />
                    ))}
                  </div>
                )}
                {b.tipo === 'enlaces' && (
                  <div className="expandido__enlaces">
                    {b.enlaces.map((e) => (
                      <a key={e.url} className="accion" href={e.url} target="_blank" rel="noopener noreferrer">{e.etiqueta}</a>
                    ))}
                  </div>
                )}
                {b.tipo === 'video' && (
                  <iframe
                    className="expandido__video"
                    src={`https://www.youtube-nocookie.com/embed/${b.youtube}`}
                    title={`${b.nombre} de ${nodo.label}`}
                    loading="lazy"
                    allowFullScreen
                  />
                )}
              </section>
            ))}
          </div>
          {/* D-39: los créditos son la misma agrupación por rol de siempre (seccionesDe), en su columna. Cada nombre entra a esa sección (D-37). */}
          {secciones.length > 0 && (
            <aside className="expandido__creditos" aria-label={'Créditos de ' + nodo.label}>
              <h3 className="expandido__titulo">Créditos</h3>
              {secciones.map((s) => (
                <section key={s.id} className="expandido__grupo" aria-labelledby={'credito-' + s.id}>
                  <h4 id={'credito-' + s.id} className="expandido__grupo-titulo" style={HEX.test(s.color) ? { color: s.color } : undefined}>{s.label}</h4>
                  <ul className="expandido__nodos">
                    {s.nodos.map((m) => {
                      const n = nodos.get(m.id)
                      return n && (
                        <li key={m.id}>
                          <a href={hrefDe(m.id)} onClick={(e) => alClick(e, s.id, m.id)}>{n.label}</a>
                          {m.rol && <> — <span className="expandido__rol">{m.rol}</span></>}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </aside>
          )}
        </div>
      </div>
    </section>
  )
}
