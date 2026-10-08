'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import CanvasSinapsis from './CanvasSinapsis'
import Overlay from './Overlay'
import DebugPanel from './DebugPanel'
import type { Fase } from './Overlay'
import { cargarAdyacencia, olvidarTopologia } from '../lib/vista/topologia.ts'
import type { Adyacencia } from '../lib/vista/adyacencia.ts'
import { indexarSlugs, rutaDe } from '../lib/red/slugs.ts'
import { estadoDesdeUrl, subgrafoDe, sumarIds, urlDe } from '../lib/red/url.ts'
import { LIMITE_HOME, semillaDeVisita } from '../lib/red/home.ts';
import type { EstadoRed } from '../lib/red/url.ts'
import { alPop, entradaValida } from '../lib/red/navegacion.ts'
import type { Entrada } from '../lib/red/navegacion.ts'
import type { Transicion } from '../types/vista.ts'

const HOME: EstadoRed = { enfocado: null, red: null, prof: null, semilla: null, raiz: null, puentes: null }
// Misma referencia siempre: dejar la red borra lo sumado sin invalidar el memo de la escena.
const SIN_GUARDAR: string[] = []

const limiteDe = () => {
  const n = Number(new URLSearchParams(window.location.search).get('limite'))
  return Number.isInteger(n) && n >= 5 && n <= 200 ? n : LIMITE_HOME
}

export default function Shell() {
  const [ady, setAdy] = useState<Adyacencia | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [engine, setEngine] = useState<any>(null)
  const [errTopo, setErrTopo] = useState(false)
  const [fase, setFase] = useState<Fase>('cargando')
  // Lo que el panel está mostrando: va por detrás de la URL (oculta, cambia, mueve la cámara, muestra).
  const [mostrado, setMostrado] = useState<EstadoRed>(HOME)
  // Nodos sumados al recorrer (D-22), atados a la red en la que se sumaron. No viajan en la URL.
  // ponytail: un solo conjunto para la red actual; volver a una red anterior no restaura el suyo. El
  // feed futuro suma y saca nodos por este mismo estado (sumarIds, limpiar al dejar la red), sin historial.
  const [sumados, setSumados] = useState<{ red: string | null; ids: string[] }>({ red: null, ids: SIN_GUARDAR })
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const panelRef = useRef<HTMLElement | null>(null)
  const entradaRef = useRef<Entrada | null>(null)
  const llegadaRef = useRef<{ t: Transicion }>({ t: 'reemplazo' })

  const estadoUrl = useMemo(() => estadoDesdeUrl(pathname, search), [pathname, search])
  const idx = useMemo(() => (ady ? indexarSlugs([...ady.nodos.values()]) : null), [ady])

  // Slug inexistente: cae a la home (Pitfall 5).
  const noEncontrado = !!idx && ((!!estadoUrl.enfocado && !idx.idPorSlug.has(estadoUrl.enfocado)) ||
    (!!estadoUrl.red && !idx.idPorSlug.has(estadoUrl.red)))
  const estado = useMemo(() => (noEncontrado ? HOME : estadoUrl), [noEncontrado, estadoUrl])
  const error = errTopo ? 'topologia' : noEncontrado ? 'no-encontrado' : null

  const guardados = sumados.red === estado.red ? sumados.ids : SIN_GUARDAR
  // `ady` llega por fetch en un effect: la escena solo existe en el cliente (limiteDe y semillaDeVisita usan el browser).
  const escena = useMemo(
    () => (ady && idx ? subgrafoDe(ady, idx, estado, guardados, { semilla: estado.semilla ?? semillaDeVisita(), limiteHome: limiteDe() }) : null),
    [ady, idx, estado, guardados],
  )
  // Ajustar estado durante el render (sin effect ni commit intermedio): lo que quedó visible se guarda
  // para que Atrás dentro de la red lo conserve; al cambiar de red se parte de cero.
  if (escena && (sumados.red !== estado.red || escena.sumados.length !== guardados.length || escena.sumados.some((id, i) => id !== guardados[i]))) {
    setSumados({ red: estado.red, ids: escena.sumados })
  }
  const sumar = (ids: string[]) => { if (escena) setSumados({ red: estado.red, ids: sumarIds(escena.sumados, ids) }) }

  const cargar = useCallback(() => { cargarAdyacencia().then(setAdy).catch(() => setErrTopo(true)) }, [])
  useEffect(() => { cargar() }, [cargar])
  const reintentar = () => { olvidarTopologia(); setErrTopo(false); cargar() }

  // ponytail: sin Navigation API; history.state propio alcanza para saber adelante/atrás.
  useEffect(() => {
    entradaRef.current = entradaValida(history.state)
    const onPop = () => {
      const nuevo = entradaValida(history.state)
      llegadaRef.current = { t: alPop(entradaRef.current, nuevo).t }
      entradaRef.current = nuevo
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // pushState (Next lo parchea y sincroniza usePathname/useSearchParams); nunca router.push.
  const navegar = (url: string, t: Transicion) => {
    const i = (entradaRef.current?.idx ?? 0) + 1
    llegadaRef.current = { t }
    entradaRef.current = { idx: i, t }
    history.pushState({ sinapsis: { idx: i, t } }, '', url)
  }
  const volver = () => ((entradaRef.current?.idx ?? 0) > 0 ? history.back() : navegar('/', 'reemplazo'))

  // enfocar = misma Vista: red/prof/semilla se conservan.
  const enfocar = (id: string) => {
    const n = ady?.nodos.get(id)
    const slug = idx?.slugPorId.get(id)
    if (!n || !idx || !slug) return
    navegar(urlDe(rutaDe(n, idx), { ...estado, enfocado: slug }), 'aditivo')
  }

  return (
    <>
      <CanvasSinapsis ady={ady} idx={idx} estado={estado} escena={escena} llegadaRef={llegadaRef} panelRef={panelRef}
        onFase={setFase} onMostrar={setMostrado} onNodoClick={enfocar} onEngineReady={setEngine} />
      <Overlay estado={estado} mostrado={mostrado} ady={ady} idx={idx} escena={escena} fase={fase} error={error} panelRef={panelRef}
        navegar={navegar} volver={volver} reintentar={reintentar} sumar={sumar} />
      {process.env.NODE_ENV !== 'production' && engine && <DebugPanel engine={engine} />}
    </>
  )
}
