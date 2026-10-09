'use client'

import BranchedMenu from './BranchedMenu.jsx'

export interface ItemMenu { id: string; label: string; color: string }

interface BranchedMenuItem {
  value?: string
  label: string
  children?: { value: string; label: string }[]
}

// Dato en el borde: solo un hex de 6 dígitos llega a style.
const HEX = /^#[0-9a-fA-F]{6}$/

// El hamburger vive en Overlay, no acá: adentro de un área este menú no tiene items (las áreas
// son de la entidad), y si el botón dependiera de este componente, en mobile no habría forma de
// abrir el cajón lateral. Acá solo se dibuja el nav; `abierto` llega controlado desde afuera.
export function MenuSuperior({ items, activoId, padreId, abierto, enArea, onElegir }: {
  items: ItemMenu[]
  activoId?: string | null
  padreId?: string | null
  abierto: boolean
  enArea?: boolean
  onElegir: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <nav className={'floatingMenu' + (abierto ? ' menu-open' : '') + (activoId || padreId ? ' menu--con-foco' : '') + (enArea ? ' menu--en-area' : '')} aria-label="Áreas">
      {items.map((i) => {
        const activo = i.id === activoId
        const padre = i.id === padreId
        return (
          <button
            key={i.id}
            className={'nav-item' + (activo ? ' nav-item--activo' : '') + (padre ? ' nav-item--padre' : '')}
            aria-current={activo ? 'true' : undefined}
            style={activo && HEX.test(i.color) ? { color: i.color } : undefined}
            onClick={() => onElegir(i.id)}
          >
            {i.label}
          </button>
        )
      })}
    </nav>
  )
}

export interface ItemLateral { id: string; label: string; subtipo: string; hijos?: ItemLateral[] }

// BranchedMenu solo entiende {value,label} (hoja, sin rama) o {label,children} (sección
// plegable, con rama). Un ItemLateral con hijos es lo segundo; sin hijos —el caso de hoy,
// una lista plana de obras— es lo primero: nivel 1, sin forzar una rama que no corresponde.
const aItemsDeMenu = (nodos: ItemLateral[]): BranchedMenuItem[] =>
  nodos.map((n) =>
    n.hijos?.length
      ? { label: n.label, children: n.hijos.map((h) => ({ value: h.id, label: h.label })) }
      : { value: n.id, label: n.label },
  )

export function MenuLateral({ nodos, enfocadoId, abierto, onElegir, onVolver, onCerrar }: {
  nodos: ItemLateral[]
  enfocadoId: string | null
  abierto: boolean
  onElegir: (id: string) => void
  onVolver: () => void
  onCerrar: () => void
}) {
  return (
    <nav className={'lateralFloatingMenu' + (abierto ? ' lateral--abierto' : '')} aria-label="Nodos de la red">
      <button className="close-lateral" aria-label="Cerrar lista" onClick={onCerrar}>×</button>
      <button className="accion accion--volver accion--lateral" onClick={onVolver}>VOLVER</button>
      {nodos.length > 0 && (
        <BranchedMenu
          items={aItemsDeMenu(nodos)}
          active={enfocadoId ?? ''}
          onSelect={(value: string) => onElegir(value)}
          onToggle={undefined}
          color="rgba(255,255,255,.9)"
          accentColor="#FF0080"
          lineColor="rgba(255,255,255,.25)"
          width={260}
        />
      )}
    </nav>
  )
}
