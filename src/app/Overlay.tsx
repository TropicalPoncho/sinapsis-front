'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01FreeIcons, ArrowRight02FreeIcons, Cancel01FreeIcons, UnfoldLessFreeIcons, UnfoldMoreFreeIcons } from '@hugeicons/core-free-icons'
import type { RefObject } from 'react'
import type { Adyacencia } from '../lib/vista/adyacencia.ts'
import type { IndiceSlugs } from '../lib/red/slugs.ts'
import { rutaDe } from '../lib/red/slugs.ts'
import type { EstadoRed, subgrafoDe } from '../lib/red/url.ts'
import { claveEstado, urlDe } from '../lib/red/url.ts'
import { botonesDe } from '../lib/red/botones.ts'
import type { Boton } from '../lib/red/botones.ts'
import type { Transicion } from '../types/vista.ts'
import { agrupadoresDe, nodosDeLaRed, padreDe, seccionesDe } from '../lib/red/menus.ts'
import type { Seccion, VocabularioRoles } from '../lib/red/menus.ts'
import rolesJson from '../lib/red/roles.json'
import { esFuturo, fechaLarga, hoyLocal } from '../lib/red/fechas.ts'
import { etiquetaDe } from '../lib/red/historial.ts'
import type { Paso } from '../lib/red/historial.ts'
import { Ficha } from './Ficha.tsx'
import { Historial } from './Historial.tsx'
import { MenuLateral, MenuSuperior } from './Menus.tsx'

// Único lector del vocabulario de roles (D-32): un solo cast del JSON.
const roles = rolesJson as VocabularioRoles

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
  tituloRef: RefObject<HTMLElement | null>
  navegar: (url: string, t: Transicion) => void
  volver: () => void
  // Historial (D-51): los pasos hacia atrás de la pila del navegador y cómo ir a uno (retroceder `delta` pasos).
  pasos: Paso[]
  irAPaso: (delta: number) => void
  reintentar: () => void
}

// El panel siempre está maquetado (nunca display:none): la cámara mide su rect antes de que aparezca.
export default function Overlay({ estado, mostrado, ady, idx, escena, fase, error, panelRef, tituloRef, navegar, volver, pasos, irAPaso, reintentar }: OverlayProps) {
  const h2Ref = useRef<HTMLHeadingElement>(null)
  // D-34/D-50: la expansión inline es estado de UI, no Vista. Se guarda la clave de la URL en la que se abrió: cualquier
  // cambio de URL (Atrás, un nodo de una sección, el menú) la pliega en ese mismo render.
  const [expandidoEn, setExpandidoEn] = useState<string | null>(null)

  const nodoDe = (e: EstadoRed) => ady && idx && e.enfocado
    ? ady.nodos.get(idx.idPorSlug.get(e.enfocado) ?? '')
    : undefined
  // El título y los menús siguen a la URL; todo lo de ADENTRO del panel sigue a `mostrado`.
  const nodoUrl = nodoDe(estado)
  const nodo = nodoDe(mostrado)
  const claveUrl = claveEstado(estado)
  if (expandidoEn !== null && expandidoEn !== claveUrl) setExpandidoEn(null)
  const expandido = expandidoEn === claveUrl
  // El contenido (y su fetch del detalle) se monta al expandir por primera vez ese nodo y queda montado al plegar: la animación de cierre lo necesita.
  const [montadoId, setMontadoId] = useState<string | null>(null)

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
  // D-44/D-47: la fecha local del visitante, una vez por render. Es la misma para "Próximo" en las dos listas de secciones y para `futuro`.
  const hoy = hoyLocal()
  // D-29/D-36: sin áreas reales, el menú superior lista las secciones derivadas de los roles de la red (mismo componente).
  const seccionesRed = ady && redId ? seccionesDe(ady, redId, roles, hoy) : []
  const deSecciones = areas.length === 0 && seccionesRed.length > 0
  const items = deSecciones ? seccionesRed : areas
  // D-37: la sección abierta es una lista de UI atada a la red en la que se abrió, no una Vista: no toca la URL ni la escena.
  // ponytail: la sección no vive en la URL (Atrás no la cierra, un link no la reproduce); salida: `?seccion=` más `filtroRoles` en la Vista.
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

  // Cerrar la sección abierta: si el foco era otro nodo, vuelve a enfocar la raíz (misma Vista: el puente usa aditivo). Es lo único que
  // quedó de VOLVER en la lista lateral; volver atrás es el historial (D-51).
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
  // D-37: abrir una sección guarda `{ red, id }` y abre la lista (en mobile, el cajón); la escena no cambia. Tocar la activa no hace nada.
  const elegirItem = (id: string) => {
    if (!deSecciones) return elegirArea(id)
    if (id === seccionActiva?.id || !estado.red) return
    setSeccion({ red: estado.red, id, llegada: true })
    setMenuAbierto(false)
    setLateralAbierto(true)
  }

  // X del panel (y Esc). Al previsualizar un área en la red de su entidad, sube al "home" de la entidad
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
  // D-50: con el foco en la raíz de la red (enfocado === red) el panel repetiría el título fijo de arriba: no se muestra. Solo aparece
  // abierto (la expansión de la raíz, desde el chevron del título); `entrado` es un caso de `raiz`.
  const raiz = estado.enfocado !== null && estado.enfocado === estado.red
  const visible = fase === 'listo' && ((nodo !== undefined && coincide && (!raiz || expandido)) || error !== null || vacia)

  const nodoId = nodo?.id ?? null
  if (expandido && nodoId !== null && montadoId !== nodoId) setMontadoId(nodoId)
  // Esc en dos niveles: con la expansión abierta la pliega; si no, hace lo de la X del panel.
  useEffect(() => {
    if (!nodo) return
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (expandido) setExpandidoEn(null); else volverDelPanel() } }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [nodo, expandido, volverDelPanel])
  useEffect(() => {
    // La raíz abierta se abre desde el chevron del título: el foco se queda ahí, no salta a un h2 que no se ve.
    if (visible && !raiz) h2Ref.current?.focus({ preventScroll: true })
  }, [visible, raiz, nodo?.id, error])

  // Las secciones del nodo del panel se calculan una vez: la misma lista decide el botón Expandir y llena la ficha.
  const secciones = nodo && ady ? seccionesDe(ady, nodo.id, roles, hoy) : []
  // D-44: un evento de hoy en adelante (la fecha local del visitante, en el cliente) muestra cuándo y dónde. El espacio es el primer nodo
  // de la sección "lugar" de roles.json. Un solo cálculo, para el panel y para la ficha.
  const futuro = nodo?.nodeType === 'EVENTO' && esFuturo(nodo.fecha, hoy)
  const seccionLugar = futuro ? secciones.find((s) => s.label === roles.lugar) : undefined
  const espacio = seccionLugar?.nodos[0] ? { id: seccionLugar.nodos[0].id, seccion: seccionLugar.id } : undefined
  // D-26: el nodo compone algo si le sale un COMPONE.
  const compone = nodo && ady ? (ady.sale.get(nodo.id) ?? []).some((v) => v.tipoVinculo === 'COMPONE') : false
  const botones = nodo
    ? botonesDe(nodo, { compone, secciones: secciones.length }).filter((b) => !(b.accion === 'entrar' && mostrado.red === mostrado.enfocado))
    : []
  // D-50: la raíz no muestra panel, así que su Expandir vive en el chevron del título. La regla sigue en un solo lugar, `botonesDe`:
  // la raíz expande si el panel de la raíz tendría el botón Expandir (mismo contexto de compone/secciones).
  const raizExpande = raiz && redNodo && ady && redId ? botonesDe(redNodo, {
    compone: (ady.sale.get(redId) ?? []).some((v) => v.tipoVinculo === 'COMPONE'),
    secciones: seccionesDe(ady, redId, roles, hoy).length,
  }).some((b) => b.accion === 'expandir') : false
  // D-48: la fecha de una ENTIDAD es la de alta en el sitio viejo, no un dato para el visitante: solo obras y eventos la muestran.
  const fecha = nodo && (nodo.nodeType === 'OBRA' || nodo.nodeType === 'EVENTO') ? fechaLarga(nodo.fecha) : ''

  const ejecutar = (b: Boton) => {
    if (!nodo || !idx) return
    switch (b.accion) {
      case 'expandir':
        setExpandidoEn(expandido ? null : claveUrl)
        break
      case 'entrar': {
        const slug = idx.slugPorId.get(nodo.id) ?? ''
        // Todo Entrar es zoom in (D-16 enmendada, D-26): reemplazo para los cuatro nodeType. El default vive solo
        // en código (D-20); para variar por tipo, acá.
        navegar(urlDe(rutaDe(nodo, idx), { enfocado: slug, red: slug, prof: estado.prof, semilla: null, raiz: null, puentes: null }), 'reemplazo')
        break
      }
      case 'enlace':
        break
    }
  }

  const alPanelScroll = (el: HTMLElement) =>
    // ponytail: escala 400px reajustable
    [el, el.parentElement!].forEach((e) => e.style.setProperty('--panel-alpha', String(Math.min(0.62, 0.55 + el.scrollTop / 400))))

  // Los nodos de una sección como lista lateral; cada uno con `rol` lo lleva aparte (`rol`: en "Otros" y los chips de un portfolio, D-46; el menú lo
  // dibuja en una segunda línea, 261117-nav1) y los
  // primeros `proximos` van marcados: el menú los pone bajo el subtítulo "Próximos" y el resto bajo "Pasados" (D-47, 261029-hui).
  const itemsDe = (s: Seccion) => s.nodos.flatMap(({ id, rol }, i) => {
    const n = ady?.nodos.get(id)
    return n ? [{ id, label: n.label, subtipo: n.subtipo, ...(rol && { rol }), ...(i < (s.proximos ?? 0) && { proximo: true as const }) }] : []
  })

  // D-50 / 261117-nav1: Volver pasa a ser una X arriba a la derecha del panel (sticky: sigue a la vista al scrollear la expansión). Con la
  // expansión de la raíz abierta no hay a dónde volver: cierra el panel.
  const cerrarBtn = (
    <button type="button" className="panel__cerrar" aria-label="Cerrar" onClick={raiz ? () => setExpandidoEn(null) : volverDelPanel}>
      <HugeiconsIcon icon={Cancel01FreeIcons} size={20} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )

  // D-51: las etiquetas salen de los datos de la Vista (nombre de la red y del foco); un paso cuyo nodo no existe (más) no se ofrece.
  const nombreDe = (slug: string) => { const id = idx?.idPorSlug.get(slug); return id ? ady?.nodos.get(id)?.label : undefined }
  const itemsHistorial = pasos.flatMap((p) => { const label = etiquetaDe(p.url, nombreDe); return label ? [{ label, delta: p.delta }] : [] })

  return (
    <div className={'overlay' + (itemsHistorial.length > 0 ? ' overlay--historial' : '')}>
      <div className={'cargando' + (fase === 'cargando' ? '' : ' cargando--fuera')} aria-hidden={fase !== 'cargando'} role="status">
        <span className="cargando__marca">Sinápsis</span>
        <div className="cargando__barra" />
      </div>

      {/* El panel siempre está maquetado, así el rect que lee el puente no cambia al expandir en escritorio. */}
      {redNodo
        // Escritorio muestra la entidad de contexto; mobile, el nombre de la red (el área adentro de un área): el CSS elige.
        ? (
          // Franja propia arriba (mobile: debajo del cajón y del menú, truncada); `con-menu` deja lugar a la hamburguesa. El chevron (D-50)
          // despliega la expansión de la raíz, que no tiene panel propio.
          <header className={'tituloRed' + (hayMenu ? ' tituloRed--con-menu' : '')} ref={tituloRef}>
            <h1 className="tituloRed__h1"><span className="tituloRed__entidad">{(entidadId && ady?.nodos.get(entidadId)?.label) || redNodo.label}</span><span className="tituloRed__red">{redNodo.label}</span></h1>
            {raizExpande && (
              <button
                type="button"
                className="tituloRed__desplegar"
                aria-expanded={expandido}
                aria-controls="panel-desplegable"
                aria-label={(expandido ? 'Plegar ' : 'Desplegar ') + redNodo.label}
                disabled={fase !== 'listo'}
                onClick={() => setExpandidoEn(expandido ? null : claveUrl)}
              >
                <HugeiconsIcon icon={ArrowDown01FreeIcons} size={20} strokeWidth={1.8} aria-hidden="true" />
              </button>
            )}
          </header>
        )
        : <h1 className={'floatingTitle' + (estado.enfocado ? ' title-hidden' : '')}>Sinápsis</h1>}
      {/* <a> a propósito: la navegación la coreografía Shell vía navegar(); next/link la saltearía. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      {redNodo && <a className={'marca' + (visible ? ' marca--oculta' : '') + (visible && expandido ? ' marca--expandido' : '')} href="/" onClick={(e) => { e.preventDefault(); navegar('/', 'reemplazo') }}>Sinápsis</a>}

      {itemsHistorial.length > 0 && <Historial items={itemsHistorial} conMenu={hayMenu} onElegir={irAPaso} />}

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
          nodos={seccionActiva ? itemsDe(seccionActiva) : nodosDeLaRed(sub!, redId, hoy)}
          enfocadoId={enfocadoId}
          abierto={lateralAbierto}
          onElegir={(id) => irA(id, false)}
          onCerrarSeccion={seccionActiva ? cerrarSeccion : undefined}
          onCerrar={() => setLateralAbierto(false)}
        />
      )}

      <aside
        ref={panelRef}
        className={'panel' + (lateral ? ' panel--con-lateral' : '') + (visible ? ' panel--visible' : '') + (expandido ? ' panel--expandido' : '')}
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
            {cerrarBtn}
            <h2 id="panel-nombre" tabIndex={-1} className="panel__nombre" ref={h2Ref}>Todavía no hay nada acá</h2>
            <p className="panel__desc">Esta red no tiene nodos cargados. Volvé y explorá otro camino.</p>
          </div>
        ) : nodo ? (
          <div className="panel__contenido" key={nodo.id}>
            {cerrarBtn}
            {/* Raíz abierta: el nombre ya está en el título fijo; acá queda para lectores de pantalla y como etiqueta de la región. */}
            <h2 id="panel-nombre" tabIndex={-1} className={'panel__nombre' + (raiz ? ' panel__nombre--oculto' : '')} ref={h2Ref}>{nodo.label}</h2>
            <p className="panel__subtipo">{nodo.subtipo}{expandido && !futuro && fecha && ` · ${fecha}`}</p>
            {futuro && <p className="panel__cuando">{fechaLarga(nodo.fecha, true)}{nodo.horario && ` · ${nodo.horario}`}</p>}
            {espacio && <button type="button" className="panel__lugar" onClick={() => irA(espacio.id, false)}>{ady?.nodos.get(espacio.id)?.label}</button>}
            {nodo.descripcionBreve && <p className="panel__desc">{nodo.descripcionBreve}</p>}
            <div className="panel__botones">
              {botones.map((b) =>
                b.accion === 'enlace' ? (
                  <a key={b.etiqueta} className="accion" href={b.destino} target="_blank" rel="noopener noreferrer">{b.etiqueta}</a>
                ) : (
                  // Entrar es la primaria (contorno con el acento, flecha); Expandir, la secundaria (borde blanco, ícono de despliegue): se leen
                  // distintas. Expandir alterna con Plegar (D-50).
                  <button
                    key={b.etiqueta}
                    className={'accion accion--' + b.accion}
                    disabled={fase !== 'listo'}
                    aria-busy={fase !== 'listo'}
                    aria-expanded={b.accion === 'expandir' ? expandido : undefined}
                    aria-controls={b.accion === 'expandir' ? 'panel-desplegable' : undefined}
                    onClick={() => ejecutar(b)}
                  >
                    {b.accion === 'expandir' && expandido ? 'Plegar' : b.etiqueta}
                    <HugeiconsIcon icon={b.accion === 'entrar' ? ArrowRight02FreeIcons : expandido ? UnfoldLessFreeIcons : UnfoldMoreFreeIcons} size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                ),
              )}
            </div>
            {/* D-50: la expansión inline. Cerrada queda en 0fr, invisible y `inert`; el contenido se monta la primera vez que se abre. */}
            {botones.some((b) => b.accion === 'expandir') && (
              <div id="panel-desplegable" className={'desplegable' + (expandido ? ' desplegable--abierto' : '')} inert={!expandido} aria-live="off">
                <div className="desplegable__interior">
                  <div className="desplegable__cuerpo">
                    {montadoId === nodo.id && ady && idx && (
                      <Ficha
                        key={nodo.id}
                        nodo={nodo}
                        secciones={secciones}
                        futuro={futuro}
                        nodos={ady.nodos}
                        hrefDe={(id) => rutaDe(ady.nodos.get(id)!, idx)}
                        onMiembro={entrarASeccion}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </aside>
      </div>
    </div>
  )
}
