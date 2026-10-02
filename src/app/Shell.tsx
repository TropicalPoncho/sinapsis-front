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
import { estadoDesdeUrl, urlDe } from '../lib/red/url.ts'
import type { EstadoRed } from '../lib/red/url.ts'
import { alPop, entradaValida } from '../lib/red/navegacion.ts'
import type { Entrada } from '../lib/red/navegacion.ts'
import type { Transicion } from '../types/vista.ts'

const HOME: EstadoRed = { enfocado: null, red: null, prof: null, semilla: null, raiz: null, puentes: null }

export default function Shell() {
  const [ady, setAdy] = useState<Adyacencia | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [engine, setEngine] = useState<any>(null)
  const [errTopo, setErrTopo] = useState(false)
  const [fase, setFase] = useState<Fase>('cargando')
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
      <CanvasSinapsis ady={ady} idx={idx} estado={estado} llegadaRef={llegadaRef} panelRef={panelRef}
        onFase={setFase} onNodoClick={enfocar} onEngineReady={setEngine} />
      <Overlay estado={estado} ady={ady} idx={idx} fase={fase} error={error} panelRef={panelRef}
        navegar={navegar} volver={volver} reintentar={reintentar} />
      {process.env.NODE_ENV !== 'production' && engine && <DebugPanel engine={engine} />}
    </>
  )
}
