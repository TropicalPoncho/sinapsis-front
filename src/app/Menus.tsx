'use client'

import { useState } from 'react'

export interface ItemMenu { id: string; label: string; color: string }

// Dato en el borde: solo un hex de 6 dígitos llega a style.
const HEX = /^#[0-9a-fA-F]{6}$/

export function MenuSuperior({ items, activoId, padreId, onElegir, onHamburguesa }: {
  items: ItemMenu[]
  activoId?: string | null
  padreId?: string | null
  onElegir: (id: string) => void
  onHamburguesa?: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  if (items.length === 0) return null
  return (
    <>
      <button
        id="hamburger"
        aria-label="Abrir menú"
        aria-expanded={abierto}
        onClick={() => { setAbierto((a) => !a); onHamburguesa?.() }}
      >
        <span /><span /><span />
      </button>
      <nav className={'floatingMenu' + (abierto ? ' menu-open' : '') + (activoId || padreId ? ' menu--con-foco' : '')} aria-label="Áreas">
        {items.map((i) => {
          const activo = i.id === activoId
          const padre = i.id === padreId
          return (
            <button
              key={i.id}
              className={'bn' + (activo ? ' bnfocus' : '') + (padre ? ' bn--padre' : '')}
              style={activo && HEX.test(i.color) ? { color: i.color } : undefined}
              onClick={() => onElegir(i.id)}
            >
              {i.label}
            </button>
          )
        })}
      </nav>
    </>
  )
}

export function MenuLateral({ nodos, enfocadoId, abierto, onElegir, onVolver, onCerrar }: {
  nodos: { id: string; label: string; subtipo: string }[]
  enfocadoId: string | null
  abierto: boolean
  onElegir: (id: string) => void
  onVolver: () => void
  onCerrar: () => void
}) {
  return (
    <nav className={'lateralFloatingMenu' + (abierto ? ' lateral--abierto' : '')} aria-label="Nodos de la red">
      <button className="close-lateral" aria-label="Cerrar lista" onClick={onCerrar}>×</button>
      <button className="bn bn--lateral" onClick={onVolver}>VOLVER</button>
      {nodos.map((n) => (
        <button key={n.id} className={'bn' + (n.id === enfocadoId ? ' bnfocus' : '')} onClick={() => onElegir(n.id)}>
          {n.label}
        </button>
      ))}
    </nav>
  )
}
