'use client'

import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01FreeIcons } from '@hugeicons/core-free-icons'

export interface ItemHistorial { label: string; delta: number }

// Chevron hacia atrás junto al título + lista desplegable de lo visitado (D-51, 261117-nav2). Solo presentación: elegir un paso le
// devuelve `delta` a quien navega. No es el chevron del título que despliega la raíz (⌄, a la derecha del nombre): este apunta
// hacia atrás, va a la izquierda y no gira al abrir (si girara a ⌄ se confundirían).
export function Historial({ items, conMenu, onElegir }: { items: ItemHistorial[]; conMenu: boolean; onElegir: (delta: number) => void }) {
  const [abierto, setAbierto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLUListElement>(null)

  const cerrar = (devolverFoco: boolean) => { setAbierto(false); if (devolverFoco) boton.current?.focus() }

  useEffect(() => {
    if (!abierto) return
    lista.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
    // Afuera cierra; Esc cierra solo esto (en captura, antes de que Overlay lo use para plegar o cerrar el panel).
    const fuera = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(true) } }
    document.addEventListener('pointerdown', fuera)
    window.addEventListener('keydown', esc, true)
    return () => { document.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', esc, true) }
  }, [abierto])

  const alTeclear = (e: React.KeyboardEvent) => {
    const filas = [...(lista.current?.querySelectorAll<HTMLElement>('button') ?? [])]
    const i = filas.indexOf(document.activeElement as HTMLElement)
    const ir = (n: number) => { e.preventDefault(); filas[(n + filas.length) % filas.length]?.focus() }
    if (e.key === 'ArrowDown') ir(i + 1)
    else if (e.key === 'ArrowUp') ir(i - 1)
    else if (e.key === 'Home') ir(0)
    else if (e.key === 'End') ir(filas.length - 1)
    else if (e.key === 'Tab') setAbierto(false)
  }

  return (
    <div ref={raiz} className={'historial' + (conMenu ? ' historial--con-menu' : '') + (abierto ? ' historial--abierto' : '')}>
      <button
        ref={boton}
        type="button"
        className="historial__boton"
        aria-label="Historial"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls="historial-lista"
        onClick={() => setAbierto((a) => !a)}
      >
        <HugeiconsIcon icon={ArrowLeft01FreeIcons} size={22} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {/* Siempre montada: cerrada queda recortada, invisible e `inert`, y la transición de apertura no depende de montarla. */}
      <ul id="historial-lista" ref={lista} className="historial__lista" role="menu" aria-label="Historial" inert={!abierto} onKeyDown={alTeclear}>
        {items.map((it) => (
          <li key={it.delta} role="none">
            <button type="button" role="menuitem" className="historial__fila" onClick={() => { setAbierto(false); onElegir(it.delta) }}>
              <span>{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
