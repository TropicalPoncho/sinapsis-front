'use client'

import { useEffect, useRef, useState } from 'react'
import type { NodoGrafo } from '../types/vista.ts'
import type { DetalleNodo } from '../lib/red/detalle.ts'
import type { Seccion } from '../lib/red/menus.ts'
import { HEX } from './Menus.tsx'

// ponytail: hoy los assets salen de public/; cuando lxs creadxrs suban obras pasa a la URL del bucket R2
// y no se reescribe ninguna fila (thumb es clave relativa por invariante).
export const BASE_ASSETS = '/'

const cache = new Map<string, DetalleNodo>()

// D-27: la capa expandida (variante A). Va por encima de todo el canvas y no mueve la cámara: el panel sigue
// maquetado debajo. Estado de UI, no Vista: no toca la URL ni el historial (D-34).
// La fecha llega como medianoche UTC; sin `timeZone` en Argentina se vería el día anterior.
const fechaLarga = (iso?: string) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null
}

export function Ficha({ nodo, secciones, nodos, hrefDe, onMiembro, onCerrar }: {
  nodo: NodoGrafo
  secciones: Seccion[]
  nodos: ReadonlyMap<string, NodoGrafo>
  hrefDe: (id: string) => string
  onMiembro: (id: string) => void
  onCerrar: () => void
}) {
  const [det, setDet] = useState<DetalleNodo | null>(cache.get(nodo.id) ?? null)
  const capaRef = useRef<HTMLElement>(null)
  const nombreRef = useRef<HTMLHeadingElement>(null)
  const [activa, setActiva] = useState(secciones[0]?.id)

  useEffect(() => { nombreRef.current?.focus({ preventScroll: true }) }, [])
  // Scroll-spy (D-27): activa es la última sección cuyo borde superior ya pasó la línea bajo la cabecera. El observer solo avisa
  // cuándo un borde cruza esa franja de 40px; la sección se decide midiendo, así volver arriba deja la primera.
  // ponytail: la franja se calcula al montar; rotar el celular con la ficha abierta la deja desfasada hasta reabrirla.
  useEffect(() => {
    const capa = capaRef.current
    const alto = capa?.querySelector('.expandido__cabecera')?.getBoundingClientRect().height
    if (!capa || !alto) return
    const els = [...capa.querySelectorAll<HTMLElement>('.expandido__seccion')]
    const linea = alto + 56
    const io = new IntersectionObserver(
      () => setActiva((els.filter((e) => e.getBoundingClientRect().top <= linea).pop() ?? els[0])?.id.slice('seccion-'.length)),
      { root: capa, rootMargin: `-${alto + 16}px 0px -${Math.max(0, capa.clientHeight - linea)}px 0px` },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [nodo.id])
  useEffect(() => {
    if (cache.has(nodo.id)) return
    const ac = new AbortController()
    fetch(`/api/nodo/${nodo.id}`, { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<DetalleNodo>) : {}))
      .then((d) => { cache.set(nodo.id, d); setDet(d) })
      .catch(() => { /* abort o error: se muestran solo las secciones */ })
    return () => ac.abort()
  }, [nodo.id])

  const alClick = (e: React.MouseEvent, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onMiembro(id)
  }
  // Sin `href="#…"`: cambiaría el hash y sumaría una entrada al historial.
  const irA = (id: string) => document.getElementById('seccion-' + id)?.scrollIntoView({ block: 'start' })

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
        <nav className="expandido__menu" aria-label={'Secciones de ' + nodo.label}>
          {secciones.map((s) => (
            <button
              key={s.id}
              type="button"
              className="expandido__item"
              aria-current={s.id === activa ? 'true' : undefined}
              style={s.id === activa && HEX.test(s.color) ? { color: s.color } : undefined}
              onClick={() => irA(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <button type="button" className="accion accion--volver expandido__volver" onClick={onCerrar}>Volver</button>
      </header>

      <div className="expandido__portada">
        <div className="expandido__columna">
          <p className="expandido__tipo">{nodo.subtipo}{fecha && ` · ${fecha}`}</p>
          {nodo.descripcionBreve && <p className="expandido__bajada">{nodo.descripcionBreve}</p>}
        </div>
      </div>

      <div className="expandido__bloque">
        <div className="expandido__columna">
          {det?.texto && <p className="expandido__texto">{det.texto}</p>}
          {secciones.map((s) => (
            <section key={s.id} id={'seccion-' + s.id} className="expandido__seccion" aria-labelledby={'seccion-' + s.id + '-t'}>
              <h3 id={'seccion-' + s.id + '-t'} className="expandido__titulo" style={HEX.test(s.color) ? { color: s.color } : undefined}>{s.label}</h3>
              <ul className="expandido__nodos">
                {s.nodos.map((m) => {
                  const n = nodos.get(m.id)
                  return n && (
                    <li key={m.id}>
                      <a href={hrefDe(m.id)} onClick={(e) => alClick(e, m.id)}>{n.label}</a>
                      {m.rol && <> — <span className="expandido__rol">{m.rol}</span></>}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          {det?.galeria && (
            <div className="expandido__galeria">
              {det.galeria.map((g) => (
                <img key={g.thumb} src={BASE_ASSETS + g.thumb} alt={g.alt ?? ''} loading="lazy" />
              ))}
            </div>
          )}
          {det?.enlaces && (
            <div className="expandido__enlaces">
              {det.enlaces.map((e) => (
                <a key={e.url} className="accion" href={e.url} target="_blank" rel="noopener noreferrer">{e.etiqueta || 'Ir al sitio'}</a>
              ))}
            </div>
          )}
          {det?.youtube && (
            <iframe
              className="expandido__video"
              src={`https://www.youtube-nocookie.com/embed/${det.youtube}`}
              title={`Video de ${nodo.label}`}
              loading="lazy"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </section>
  )
}
