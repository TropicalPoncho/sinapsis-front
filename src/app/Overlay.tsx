'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Adyacencia } from '../lib/vista/adyacencia.ts'
import type { IndiceSlugs } from '../lib/red/slugs.ts'
import { rutaDe } from '../lib/red/slugs.ts'
import type { EstadoRed, subgrafoDe } from '../lib/red/url.ts'
import { claveEstado, urlDe } from '../lib/red/url.ts'
import { botonesDe } from '../lib/red/botones.ts'
import type { Boton } from '../lib/red/botones.ts'
import type { Transicion } from '../types/vista.ts'
import { agrupadoresDe, nodosDeLaRed, obrasDe, padreDe, seccionesDe } from '../lib/red/menus.ts'
import type { Seccion, VocabularioRoles } from '../lib/red/menus.ts'
import roles from '../lib/red/roles.json'
import { Ficha } from './Ficha.tsx'
import { MenuLateral, MenuSuperior } from './Menus.tsx'

export type Fase = 'cargando' | 'moviendo' | 'listo'

export interface OverlayProps {
  estado: EstadoRed
  // Lo que el panel está mostrando; va por detrás de `estado` (ver CanvasSinapsis: onMostrar).
  mostrado: EstadoRed
  ady: Adyacencia | null
  idx: IndiceSlugs | null
  // Lo visible (Vista de la URL + lo sumado al recorrer, D-22): un solo cálculo, el del Shell.
  escena: ReturnType<typeof subgrafoDe> | null
  fase: Fase
  error: 'topologia' | 'no-encontrado' | null
  panelRef: RefObject<HTMLElement | null>
  // El título de la red: en mobile es grande y tapa arriba, así que el puente lo mide (área segura `top`).
  tituloRef: RefObject<HTMLHeadingElement | null>
  navegar: (url: string, t: Transicion) => void
  volver: () => void
  reintentar: () => void
  sumar: (ids: string[]) => void
}

// El panel siempre está maquetado (nunca display:none): la cámara mide su rect antes de que aparezca.
export default function Overlay({ estado, mostrado, ady, idx, escena, fase, error, panelRef, tituloRef, navegar, volver, reintentar, sumar }: OverlayProps) {
  const h2Ref = useRef<HTMLHeadingElement>(null)
  // D-34: la ficha expandida es estado de UI, no Vista. Se guarda la clave de la URL en la que se abrió: cualquier
  // cambio de URL (Atrás, un nodo de una sección, el menú) la cierra en ese mismo render.
  const [expandidoEn, setExpandidoEn] = useState<string | null>(null)
  const [puedeVolver, setPuedeVolver] = useState(false)

  const nodoDe = (e: EstadoRed) => ady && idx && e.enfocado
    ? ady.nodos.get(idx.idPorSlug.get(e.enfocado) ?? '')
    : undefined
  // El título y los menús siguen a la URL; todo lo de ADENTRO del panel sigue a `mostrado`.
  const nodoUrl = nodoDe(estado)
  const nodo = nodoDe(mostrado)
  const claveUrl = claveEstado(estado)
  if (expandidoEn !== null && expandidoEn !== claveUrl) setExpandidoEn(null)
  const expandido = expandidoEn === claveUrl

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

  const sub = redId ? escena?.sub ?? null : null

  // Entidad de contexto (D-25): la red si es una ENTIDAD, o la dueña del área si la red es una AGRUPACION.
  // Es la del título y la de las áreas del menú superior, también al previsualizar y adentro de un área.
  const entidadId = !ady || !redNodo || !redId ? null
    : redNodo.nodeType === 'ENTIDAD' ? redId
    : redNodo.nodeType === 'AGRUPACION' ? padreDe(ady, redId, 'ENTIDAD') : null
  const areas = ady && entidadId ? agrupadoresDe(ady, entidadId) : []
  // D-29/D-36: sin áreas reales, el menú superior lista las secciones derivadas de los roles de la red (mismo componente).
  const seccionesRed = ady && redId ? seccionesDe(ady, redId, roles as VocabularioRoles) : []
  const deSecciones = areas.length === 0 && seccionesRed.length > 0
  const items = deSecciones ? seccionesRed : areas
  // D-37: la sección abierta es una lista de UI atada a la red en la que se abrió, no una Vista: no toca la URL ni la escena.
  // `llegada`: ya se vio la URL en esa red (la entrada desde la ficha la guarda antes de que la URL llegue).
  const [seccion, setSeccion] = useState<{ red: string; id: string; llegada: boolean } | null>(null)
  if (seccion) {
    if (!seccion.llegada && seccion.red === estado.red) setSeccion({ ...seccion, llegada: true })
    else if (seccion.llegada && seccion.red !== estado.red) setSeccion(null) // cambio de red: se descarta sola
  }
  const seccionActiva = deSecciones && seccion && seccion.red === estado.red ? seccionesRed.find((s) => s.id === seccion.id) ?? null : null
  // Activa: el área en la que se está o, al previsualizar, la enfocada (o la sección abierta). El padre se marca solo si es otra.
  const activoId = deSecciones ? seccionActiva?.id ?? null
    : (areas.find((i) => i.id === redId) ?? areas.find((i) => i.id === enfocadoId))?.id ?? null
  const padre = ady && enfocadoId && !deSecciones ? padreDe(ady, enfocadoId) : null
  const padreId = padre !== activoId ? padre : null
  const lateral = (sub !== null && redId !== null && estado.red !== null && redNodo?.nodeType === 'AGRUPACION') || seccionActiva !== null
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

  // Previsualiza un área en la red de su dueña (D-25): el mismo camino que "Entrar" pero al revés, con
  // reemplazo, así la cámara sale de la neurona (D-18). Sin dueña no hay a dónde subir: Atrás del Shell.
  // La dueña es la entidad de contexto de arriba: se calcula en un solo lugar.
  const aLaDuena = (areaId: string) => {
    const area = ady?.nodos.get(areaId)
    const slug = idx?.slugPorId.get(areaId)
    const duena = idx && entidadId ? idx.slugPorId.get(entidadId) : undefined
    if (!area || !idx || !slug || !duena) return volver()
    setLateralAbierto(false)
    setMenuAbierto(false)
    navegar(urlDe(rutaDe(area, idx), { enfocado: slug, red: duena, prof: null, semilla: null, raiz: null, puentes: null }), 'reemplazo')
  }

  // Menú superior (D-25 c): tocar el área en la que se está no hace nada; desde adentro de un área, otra
  // se previsualiza en la red de la entidad (excepción explícita de D-23), no se suma a la del área.
  const elegirArea = (id: string) => {
    if (id === redId) return
    if (redId === entidadId) irA(id, false)
    else aLaDuena(id)
  }

  // VOLVER de la lista lateral sube un nivel; no es "atrás" en el historial (podría salir del área
  // entera si hubo varios focos en el medio). Con otro nodo enfocado, suelta el foco y vuelve al
  // panorama del área; en el panorama, sube a la red de la dueña con el área enfocada (G-09, D-25).
  const volverAlArea = () => {
    if (!redId) return
    if (enfocadoId !== redId) irA(redId, true)
    else aLaDuena(redId)
  }

  // D-37: abrir una sección guarda `{ red, id }` y abre la lista (en mobile, el cajón); la escena no cambia. Tocar la activa no hace nada.
  const abrirSeccion = (id: string) => {
    if (id === seccionActiva?.id || !estado.red) return
    setSeccion({ red: estado.red, id, llegada: true })
    setMenuAbierto(false)
    setLateralAbierto(true)
  }
  // VOLVER de una sección la cierra y, si el foco era otro nodo, vuelve a enfocar la raíz (misma Vista: el puente usa aditivo).
  const cerrarSeccion = () => {
    setSeccion(null)
    if (redId && enfocadoId !== redId) irA(redId, true)
  }
  // D-30/D-37: desde la ficha, un nodo de una sección lleva a esa sección en la red del nodo de la ficha. Si no se está en esa
  // red se entra con zoom in (reemplazo) enfocando al tocado; la sección queda guardada y se activa apenas la URL llega a la red.
  const entrarASeccion = (seccionId: string, id: string) => {
    const n = ady?.nodos.get(id)
    const slug = idx?.slugPorId.get(id)
    const slugFicha = nodo && idx ? idx.slugPorId.get(nodo.id) : undefined
    if (!n || !idx || !slug || !slugFicha) return
    setExpandidoEn(null)
    setLateralAbierto(false)
    setMenuAbierto(false)
    const dentro = estado.red === slugFicha
    setSeccion({ red: slugFicha, id: seccionId, llegada: dentro })
    if (dentro) irA(id, false)
    else navegar(urlDe(rutaDe(n, idx), { enfocado: slug, red: slugFicha, prof: null, semilla: null, raiz: null, puentes: null }), 'reemplazo')
  }
  const elegirItem = (id: string) => (deSecciones ? abrirSeccion(id) : elegirArea(id))

  // Volver del panel (y Esc). Al previsualizar un área en la red de su entidad, sube al "home" de la entidad
  // (sin foco en el área) en vez de deshacer el historial: Atrás volvería a entrar al área, que es lo contrario.
  const volverDelPanel = useCallback(() => {
    const slugEntidad = idx && entidadId ? idx.slugPorId.get(entidadId) : undefined
    const entidad = ady && entidadId ? ady.nodos.get(entidadId) : undefined
    if (nodo?.nodeType === 'AGRUPACION' && nodo.id !== redId && entidad && idx && slugEntidad) {
      navegar(urlDe(rutaDe(entidad, idx), { enfocado: slugEntidad, red: slugEntidad, prof: null, semilla: null, raiz: null, puentes: null }), 'aditivo')
    } else volver()
  }, [ady, idx, entidadId, nodo, redId, navegar, volver])

  // Cuando cambia la URL el panel empieza a salir en ese mismo render, con el contenido viejo.
  const coincide = claveEstado(mostrado) === claveEstado(estado)
  // Adentro de una red sin nada más que ella misma (un área sin miembros). Espera a `coincide`: si no, el
  // texto cambiaría mientras el panel todavía está saliendo con el contenido viejo.
  const vacia = entrado && coincide && sub !== null && sub.nodos.every((n) => n.id === redId)
  const visible = fase === 'listo' && ((nodo !== undefined && !entrado && coincide) || error !== null || vacia)

  // Sigue a `mostrado`, no a la URL: si el botón desaparece apenas cambia la URL, el panel (en mobile,
  // de alto automático) se achica mientras sale y el encuadre salta antes de que la cámara se mueva.
  useEffect(() => {
    setPuedeVolver(((history.state as { sinapsis?: { idx?: number } } | null)?.sinapsis?.idx ?? 0) > 0)
  }, [mostrado])
  // Cierra la ficha y devuelve el foco al título del panel; en el cuadro siguiente, porque mientras el overlay base
  // siga `inert` el foco no puede entrar.
  const cerrarFicha = useCallback(() => {
    setExpandidoEn(null)
    requestAnimationFrame(() => h2Ref.current?.focus({ preventScroll: true }))
  }, [])
  // Esc en dos niveles: con la ficha abierta la cierra; si no, hace lo del Volver del panel.
  useEffect(() => {
    if (!nodo) return
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (expandido) cerrarFicha(); else volverDelPanel() } }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [nodo, expandido, cerrarFicha, volverDelPanel])
  useEffect(() => {
    if (visible) h2Ref.current?.focus({ preventScroll: true })
  }, [visible, nodo?.id, error])

  // Las secciones del nodo del panel se calculan una vez: la misma lista decide el botón Expandir y llena la ficha.
  const secciones = nodo && ady ? seccionesDe(ady, nodo.id, roles as VocabularioRoles) : []
  // D-26: el nodo compone algo si le sale un COMPONE.
  const compone = nodo && ady ? (ady.sale.get(nodo.id) ?? []).some((v) => v.tipoVinculo === 'COMPONE') : false
  // Las obras/eventos de la entidad enfocada que todavía no están en escena (D-22: se suman sin navegar).
  const porSumar = nodo && ady && escena && nodo.nodeType === 'ENTIDAD'
    ? obrasDe(ady, nodo.id).filter((id) => !escena.sub.nodos.some((n) => n.id === id))
    : []
  const botones = nodo
    ? botonesDe(nodo, { compone, secciones: secciones.length, obrasPorSumar: porSumar.length }).filter((b) => !((b.accion === 'entrar' || b.accion === 'sumar') && mostrado.red === mostrado.enfocado))
    : []

  const ejecutar = (b: Boton) => {
    if (!nodo || !idx) return
    switch (b.accion) {
      case 'expandir':
        setExpandidoEn(claveUrl)
        break
      case 'entrar': {
        const slug = idx.slugPorId.get(nodo.id) ?? ''
        // Todo Entrar es zoom in (D-16 enmendada, D-26): reemplazo para los cuatro nodeType. El default vive solo
        // en código (D-20); para variar por tipo, acá.
        navegar(urlDe(rutaDe(nodo, idx), { enfocado: slug, red: slug, prof: estado.prof, semilla: null, raiz: null, puentes: null }), 'reemplazo')
        break
      }
      case 'sumar':
        sumar(porSumar)
        break
      case 'enlace':
        break
    }
  }

  const alPanelScroll = (el: HTMLElement) =>
    // ponytail: escala 400px reajustable
    [el, el.parentElement!].forEach((e) => e.style.setProperty('--panel-alpha', String(Math.min(0.9, 0.55 + el.scrollTop / 400))))

  // Los nodos de una sección como lista lateral; en "Otros" cada uno lleva " — rol".
  const itemsDe = (s: Seccion) => s.nodos.flatMap(({ id, rol }) => {
    const n = ady?.nodos.get(id)
    return n ? [{ id, label: rol ? `${n.label} — ${rol}` : n.label, subtipo: n.subtipo }] : []
  })

  const volverBtn = puedeVolver && <button className="accion accion--volver" onClick={volverDelPanel}>Volver</button>

  return (
    <div className="overlay">
      <div className={'cargando' + (fase === 'cargando' ? '' : ' cargando--fuera')} aria-hidden={fase !== 'cargando'} role="status">
        <span className="cargando__marca">Sinápsis</span>
        <div className="cargando__barra" />
      </div>

      {/* D-34: con la ficha abierta el resto del overlay queda inert (nativo) y oculto; el panel sigue maquetado, así el rect que lee el puente no cambia. */}
      <div className="overlay__base" inert={expandido}>
      {redNodo
        // Escritorio muestra la entidad de contexto; mobile, el nombre de la red (el área adentro de un área): el CSS elige.
        ? <h1 className="tituloRed" ref={tituloRef}><span className="tituloRed__entidad">{(entidadId && ady?.nodos.get(entidadId)?.label) || redNodo.label}</span><span className="tituloRed__red">{redNodo.label}</span></h1>
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
        enArea={lateral}
        onElegir={elegirItem}
      />
      <div className={'izquierda' + (visible ? ' izquierda--visible' : '')}>
      {lateral && ady && redId && (seccionActiva || sub) && (
        <MenuLateral
          nodos={seccionActiva ? itemsDe(seccionActiva) : nodosDeLaRed(sub!, redId)}
          enfocadoId={enfocadoId}
          abierto={lateralAbierto}
          onElegir={(id) => irA(id, false)}
          onVolver={seccionActiva ? cerrarSeccion : volverAlArea}
          onCerrar={() => setLateralAbierto(false)}
        />
      )}

      <aside
        ref={panelRef}
        className={'panel' + (lateral ? ' panel--con-lateral' : '') + (visible ? ' panel--visible' : '')}
        role="region"
        aria-labelledby="panel-nombre"
        aria-live="polite"
        aria-busy={fase === 'moviendo'}
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
        ) : vacia ? (
          <div className="panel__contenido">
            <h2 id="panel-nombre" tabIndex={-1} className="panel__nombre" ref={h2Ref}>Todavía no hay nada acá</h2>
            <p className="panel__desc">Esta red no tiene nodos cargados. Volvé y explorá otro camino.</p>
            <div className="panel__botones">{volverBtn}</div>
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
                    {b.accion === 'entrar' && !b.etiqueta ? 'Entrar' : b.etiqueta}
                  </button>
                ),
              )}
              {volverBtn}
            </div>
          </div>
        ) : null}
      </aside>
      </div>
      </div>

      {expandido && nodo && ady && idx && (
        <Ficha
          key={nodo.id}
          nodo={nodo}
          secciones={secciones}
          nodos={ady.nodos}
          hrefDe={(id) => rutaDe(ady.nodos.get(id)!, idx)}
          onMiembro={entrarASeccion}
          onCerrar={cerrarFicha}
        />
      )}
    </div>
  )
}
