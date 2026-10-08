'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Adyacencia } from '../lib/vista/adyacencia.ts'
import { resolverVista } from '../lib/vista/resolverVista.ts'
import type { IndiceSlugs } from '../lib/red/slugs.ts'
import { rutaDe } from '../lib/red/slugs.ts'
import type { EstadoRed } from '../lib/red/url.ts'
import { claveEstado, urlDe, vistaDe } from '../lib/red/url.ts'
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
  // Lo que el panel está mostrando; va por detrás de `estado` (ver CanvasSinapsis: onMostrar).
  mostrado: EstadoRed
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
export default function Overlay({ estado, mostrado, ady, idx, fase, error, panelRef, navegar, volver, reintentar }: OverlayProps) {
  const h2Ref = useRef<HTMLHeadingElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [puedeVolver, setPuedeVolver] = useState(false)

  const nodoDe = (e: EstadoRed) => ady && idx && e.enfocado
    ? ady.nodos.get(idx.idPorSlug.get(e.enfocado) ?? '')
    : undefined
  // El título y los menús siguen a la URL; todo lo de ADENTRO del panel sigue a `mostrado`.
  const nodoUrl = nodoDe(estado)
  const nodo = nodoDe(mostrado)

  const redId = ady && idx && estado.red ? idx.idPorSlug.get(estado.red) ?? null : null
  const enfocadoId = nodoUrl?.id ?? null

  // Entrar en una entidad/agrupación: se ve toda su red, el nombre pasa a ser el título y el panel se retira.
  // El menú de áreas es parte de "entrado", no de "enfocado con el panel abierto": una cosa es el
  // preview de un nodo (panel + botón Entrar) y otra muy distinta estar adentro de su red.
  const entrado = nodoUrl !== undefined && estado.red === estado.enfocado && nodoUrl.nodeType !== 'OBRA' && nodoUrl.nodeType !== 'EVENTO'
  // El título de la red en la que estás NO depende de qué nodo tengas enfocado ahora mismo:
  // sigue siendo "Obras" mientras mirás una obra adentro de Obras, no vuelve a "Sinápsis" hasta
  // que de verdad salís de la red (estado.red === null).
  const redNodo = ady && redId ? ady.nodos.get(redId) : undefined

  const sub = useMemo(() => {
    if (!ady || !redId) return null
    return resolverVista(ady, vistaDe(estado, redId, ady.nodos.get(redId)?.nodeType))
  }, [ady, redId, estado])
  const subredVacia = sub !== null && sub.nodos.length <= 1

  const entidadId = ady && entrado ? entidadDeMenu(ady, { redId, enfocadoId }) : null
  const items = ady && entidadId ? agrupadoresDe(ady, entidadId) : []
  const activoId = items.find((i) => i.id === redId)?.id ?? null
  const padreId = ady && enfocadoId ? padreDe(ady, enfocadoId) : null
  const lateral = sub !== null && redId !== null && estado.red !== null && ady?.nodos.get(redId)?.nodeType === 'AGRUPACION'
  const [lateralAbierto, setLateralAbierto] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  // Un solo botón hamburger en mobile, sea cual sea el menú que exista en este contexto (áreas de
  // una entidad o la lista de un área): si dependiera de MenuSuperior, adentro de un área —donde
  // items siempre es []— no habría forma de abrir el cajón lateral.
  const hayMenu = items.length > 0 || lateral
  const alHamburguesa = () => { setMenuAbierto((a) => !a); setLateralAbierto((a) => !a) }

  const irA = (id: string, red: boolean) => {
    const n = ady?.nodos.get(id)
    const slug = idx?.slugPorId.get(id)
    if (!n || !idx || !slug) return
    setLateralAbierto(false)
    setMenuAbierto(false)
    if (red) navegar(urlDe(rutaDe(n, idx), { enfocado: slug, red: slug, prof: null, semilla: null, raiz: null, puentes: null }), 'reemplazo')
    else navegar(urlDe(rutaDe(n, idx), { ...estado, enfocado: slug }), 'aditivo')
  }

  // VOLVER de la lista lateral no es "atrás" en el historial (podría salir del área entera si
  // hubo varios focos en el medio): es soltar el foco puntual y volver al panorama del área misma.
  const volverAlArea = () => { if (redId) irA(redId, true) }

  // Cuando cambia la URL el panel empieza a salir en ese mismo render, con el contenido viejo.
  const coincide = claveEstado(mostrado) === claveEstado(estado)
  const visible = fase === 'listo' && ((nodo !== undefined && !entrado && coincide) || error !== null || subredVacia)

  useEffect(() => { setAbierto(false) }, [mostrado.enfocado])
  // Sigue a `mostrado`, no a la URL: si el botón desaparece apenas cambia la URL, el panel (en mobile,
  // de alto automático) se achica mientras sale y el encuadre salta antes de que la cámara se mueva.
  useEffect(() => {
    setPuedeVolver(((history.state as { sinapsis?: { idx?: number } } | null)?.sinapsis?.idx ?? 0) > 0)
  }, [mostrado])
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
    ? botonesDe(nodo, { grado }).filter((b) => !(b.accion === 'entrar' && mostrado.red === mostrado.enfocado))
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
          urlDe(rutaDe(nodo, idx), { enfocado: slug, red: slug, prof: estado.prof, semilla: null, raiz: null, puentes: null }),
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
    [el, el.parentElement!].forEach((e) => e.style.setProperty('--panel-alpha', String(Math.min(0.9, 0.55 + el.scrollTop / 400))))

  const volverBtn = puedeVolver && <button className="accion accion--volver" onClick={volver}>Volver</button>

  return (
    <div className="overlay">
      <div className={'cargando' + (fase === 'cargando' ? '' : ' cargando--fuera')} aria-hidden={fase !== 'cargando'} role="status">
        <span className="cargando__marca">Sinápsis</span>
        <div className="cargando__barra" />
      </div>

      {redNodo
        ? <h1 className="tituloRed">{redNodo.label}</h1>
        : <h1 className={'floatingTitle' + (estado.enfocado ? ' title-hidden' : '')}>Sinápsis</h1>}
      {/* <a> a propósito: la navegación la coreografía Shell vía navegar(); next/link la saltearía. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      {redNodo && <a className={'marca' + (visible ? ' marca--oculta' : '')} href="/" onClick={(e) => { e.preventDefault(); navegar('/', 'reemplazo') }}>Sinápsis</a>}

      {hayMenu && (
        <button id="hamburger" aria-label="Abrir menú" aria-expanded={menuAbierto || lateralAbierto} onClick={alHamburguesa}>
          <span /><span /><span />
        </button>
      )}
      <MenuSuperior
        items={items}
        activoId={activoId}
        padreId={padreId}
        abierto={menuAbierto}
        onElegir={(id) => irA(id, false)}
      />
      <div className={'izquierda' + (visible ? ' izquierda--visible' : '')}>
      {lateral && sub && redId && (
        <MenuLateral
          nodos={nodosDeLaRed(sub, redId)}
          enfocadoId={enfocadoId}
          abierto={lateralAbierto}
          onElegir={(id) => irA(id, false)}
          onVolver={volverAlArea}
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
            <div className="panel__botones"><button className="accion" onClick={reintentar}>Reintentar</button></div>
          </div>
        ) : error === 'no-encontrado' ? (
          <div className="panel__contenido">
            <h2 id="panel-nombre" tabIndex={-1} className="panel__nombre" ref={h2Ref}>
              No encontramos ese nodo. Puede que el link haya cambiado. Volvé a la red y seguí explorando.
            </h2>
            <div className="panel__botones"><button className="accion" onClick={() => navegar('/', 'reemplazo')}>Ir a la red</button></div>
          </div>
        ) : nodo ? (
          <div className="panel__contenido" key={nodo.id}>
            <h2 id="panel-nombre" tabIndex={-1} className="panel__nombre" ref={h2Ref}>{nodo.label}</h2>
            <p className="panel__subtipo">{nodo.subtipo}</p>
            {nodo.descripcionBreve && <p className="panel__desc">{nodo.descripcionBreve}</p>}
            <div className="panel__botones">
              {botones.map((b) =>
                b.accion === 'enlace' ? (
                  <a key={b.etiqueta} className="accion" href={b.destino} target="_blank" rel="noopener noreferrer">{b.etiqueta}</a>
                ) : (
                  <button key={b.etiqueta} className="accion" disabled={fase !== 'listo'} aria-busy={fase !== 'listo'} onClick={() => ejecutar(b)}>
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
    </div>
  )
}
