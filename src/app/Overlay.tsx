'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Adyacencia } from '../lib/vista/adyacencia.ts'
import { resolverVista } from '../lib/vista/resolverVista.ts'
import type { IndiceSlugs } from '../lib/red/slugs.ts'
import { rutaDe } from '../lib/red/slugs.ts'
import type { EstadoRed } from '../lib/red/url.ts'
import { urlDe, vistaDe } from '../lib/red/url.ts'
import { botonesDe } from '../lib/red/botones.ts'
import type { Boton } from '../lib/red/botones.ts'
import { transicionEntrada } from '../lib/red/navegacion.ts'
import type { Transicion } from '../types/vista.ts'
import { agrupadoresDe, creditosDe, entidadDeMenu, nodosDeLaRed, padreDe } from '../lib/red/menus.ts'
import { Ficha } from './Ficha.tsx'
import { MenuLateral, MenuSuperior } from './Menus.tsx'

export type Fase = 'cargando' | 'moviendo' | 'listo'

export interface OverlayProps {
  estado: EstadoRed
  ady: Adyacencia | null
  idx: IndiceSlugs | null
  fase: Fase
  error: 'topologia' | 'no-encontrado' | null
  panelRef: RefObject<HTMLElement | null>
  navegar: (url: string, t: Transicion) => void
  volver: () => void
  reintentar: () => void
}

// El panel siempre está maquetado (nunca display:none): la cámara mide su rect antes de que aparezca.
export default function Overlay({ estado, ady, idx, fase, error, panelRef, navegar, volver, reintentar }: OverlayProps) {
  const h2Ref = useRef<HTMLHeadingElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [puedeVolver, setPuedeVolver] = useState(false)

  const nodo = ady && idx && estado.enfocado
    ? ady.nodos.get(idx.idPorSlug.get(estado.enfocado) ?? '')
    : undefined

  const redId = ady && idx && estado.red ? idx.idPorSlug.get(estado.red) ?? null : null
  const enfocadoId = nodo?.id ?? null

  const sub = useMemo(() => {
    if (!ady || !redId) return null
    return resolverVista(ady, vistaDe(estado, redId, ady.nodos.get(redId)?.nodeType))
  }, [ady, redId, estado])
  const subredVacia = sub !== null && sub.nodos.length <= 1

  const entidadId = ady ? entidadDeMenu(ady, { redId, enfocadoId }) : null
  const items = ady && entidadId ? agrupadoresDe(ady, entidadId) : []
  const activoId = items.find((i) => i.id === redId)?.id ?? null
  const padreId = ady && enfocadoId ? padreDe(ady, enfocadoId) : null
  const lateral = sub !== null && redId !== null && estado.red !== null
  const [lateralAbierto, setLateralAbierto] = useState(false)

  const irA = (id: string, red: boolean) => {
    const n = ady?.nodos.get(id)
    const slug = idx?.slugPorId.get(id)
    if (!n || !idx || !slug) return
    setLateralAbierto(false)
    if (red) navegar(urlDe(rutaDe(n, idx), { enfocado: slug, red: slug, prof: null, semilla: null }), 'reemplazo')
    else navegar(urlDe(rutaDe(n, idx), { ...estado, enfocado: slug }), 'aditivo')
  }

  const visible = fase === 'listo' && (nodo !== undefined || error !== null || subredVacia)

  useEffect(() => { setAbierto(false) }, [estado.enfocado])
  useEffect(() => {
    setPuedeVolver(((history.state as { sinapsis?: { idx?: number } } | null)?.sinapsis?.idx ?? 0) > 0)
  }, [estado])
  useEffect(() => {
    if (!nodo) return
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') volver() }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [nodo, volver])
  useEffect(() => {
    if (visible) h2Ref.current?.focus({ preventScroll: true })
  }, [visible, nodo?.id, error])

  const grado = nodo && ady ? (ady.sale.get(nodo.id)?.length ?? 0) + (ady.entra.get(nodo.id)?.length ?? 0) : 0
  const botones = nodo
    ? botonesDe(nodo, { grado }).filter((b) => !(b.accion === 'entrar' && estado.red === estado.enfocado))
    : []

  const ejecutar = (b: Boton) => {
    if (!nodo || !idx) return
    switch (b.accion) {
      case 'expandir':
        setAbierto((a) => !a)
        break
      case 'entrar': {
        const slug = idx.slugPorId.get(nodo.id) ?? ''
        navegar(
          urlDe(rutaDe(nodo, idx), { enfocado: slug, red: slug, prof: estado.prof, semilla: null }),
          transicionEntrada(nodo.nodeType),
        )
        break
      }
      case 'enlace':
        break
    }
  }

  const alPanelScroll = (el: HTMLElement) =>
    // ponytail: escala 400px reajustable
    el.style.setProperty('--panel-alpha', String(Math.min(0.9, 0.55 + el.scrollTop / 400)))

  const volverBtn = puedeVolver && <button className="bn" onClick={volver}>Volver</button>

  return (
    <div className="overlay">
      <div className={'cargando' + (fase === 'cargando' ? '' : ' cargando--fuera')} aria-hidden={fase !== 'cargando'} role="status">
        <span className="cargando__marca">Sinápsis</span>
        <div className="cargando__barra" />
      </div>

      <h1 className={'floatingTitle' + (estado.enfocado ? ' title-hidden' : '')}>Sinápsis</h1>
      {!estado.enfocado && <p className="home__bajada">Red social para creadxrs y obra colectiva</p>}

      <MenuSuperior
        items={items}
        activoId={activoId}
        padreId={padreId}
        onElegir={(id) => irA(id, true)}
        onHamburguesa={() => setLateralAbierto((a) => !a)}
      />
      {lateral && sub && redId && (
        <MenuLateral
          nodos={nodosDeLaRed(sub, redId)}
          enfocadoId={enfocadoId}
          abierto={lateralAbierto}
          onElegir={(id) => irA(id, false)}
          onVolver={volver}
          onCerrar={() => setLateralAbierto(false)}
        />
      )}

      <aside
        ref={panelRef}
        className={'panel' + (lateral ? ' panel--con-lateral' : '') + (visible ? ' panel--visible' : '') + (abierto ? ' panel--extendido' : '')}
        role="region"
        aria-labelledby="panel-nombre"
        aria-live="polite"
        aria-busy={fase === 'moviendo'}
        data-abierto={abierto}
        onScroll={(e) => alPanelScroll(e.currentTarget)}
      >
        {error === 'topologia' ? (
          <div className="panel__contenido">
            <h2 id="panel-nombre" tabIndex={-1} className="panel__nombre" ref={h2Ref}>
              No pudimos cargar la red. Revisá tu conexión e intentá de nuevo.
            </h2>
            <div className="panel__botones"><button className="bn" onClick={reintentar}>Reintentar</button></div>
          </div>
        ) : error === 'no-encontrado' ? (
          <div className="panel__contenido">
            <h2 id="panel-nombre" tabIndex={-1} className="panel__nombre" ref={h2Ref}>
              No encontramos ese nodo. Puede que el link haya cambiado. Volvé a la red y seguí explorando.
            </h2>
            <div className="panel__botones"><button className="bn" onClick={() => navegar('/', 'reemplazo')}>Ir a la red</button></div>
          </div>
        ) : nodo ? (
          <div className="panel__contenido" key={nodo.id}>
            <h2 id="panel-nombre" tabIndex={-1} className="panel__nombre" ref={h2Ref}>{nodo.label}</h2>
            <p className="panel__subtipo">{nodo.subtipo}</p>
            {nodo.descripcionBreve && <p className="panel__desc">{nodo.descripcionBreve}</p>}
            <div className="panel__botones">
              {botones.map((b) =>
                b.accion === 'enlace' ? (
                  <a key={b.etiqueta} className="bn" href={b.destino} target="_blank" rel="noopener noreferrer">{b.etiqueta}</a>
                ) : (
                  <button key={b.etiqueta} className="bn" disabled={fase !== 'listo'} aria-busy={fase !== 'listo'} onClick={() => ejecutar(b)}>
                    {b.accion === 'expandir' && abierto ? 'Ver menos' : b.accion === 'entrar' && !b.etiqueta ? 'Entrar' : b.etiqueta}
                  </button>
                ),
              )}
              {volverBtn}
            </div>
            {abierto && ady && idx && (nodo.nodeType === 'OBRA' || nodo.nodeType === 'EVENTO') && (
              <Ficha
                key={nodo.id}
                nodo={nodo}
                creditos={creditosDe(ady, nodo.id)}
                hrefDe={(id) => rutaDe(ady.nodos.get(id)!, idx)}
                onEnfocar={(id) => irA(id, false)}
              />
            )}
          </div>
        ) : subredVacia ? (
          <div className="panel__contenido">
            <h2 id="panel-nombre" tabIndex={-1} className="panel__nombre" ref={h2Ref}>Todavía no hay nada acá</h2>
            <p className="panel__desc">Esta red no tiene nodos cargados. Volvé y explorá otro camino.</p>
            <div className="panel__botones">{volverBtn}</div>
          </div>
        ) : null}
      </aside>
    </div>
  )
}
