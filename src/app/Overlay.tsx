'use client'

import type { RefObject } from 'react'
import type { Adyacencia } from '../lib/vista/adyacencia.ts'
import type { IndiceSlugs } from '../lib/red/slugs.ts'
import type { EstadoRed } from '../lib/red/url.ts'
import type { Transicion } from '../types/vista.ts'

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

// Esqueleto: el plan 05 llena el cuerpo. El panel siempre está maquetado (nunca display:none):
// la cámara mide su rect antes de que aparezca.
export default function Overlay({ fase, panelRef }: OverlayProps) {
  return (
    <>
      {fase === 'cargando' && <div className="cargando" />}
      <aside ref={panelRef} className="panel" />
    </>
  )
}
