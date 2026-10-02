'use client'

// Copiado de https://reactbits.dev/c/micro/branched-menu (JS + CSS), con un solo cambio propio:
// `active` puede llegar controlado desde afuera (además de `defaultActive`), porque acá el nodo
// enfocado lo decide la URL/el motor 3D, no solo un click adentro de este menú. Sin eso, tocar un
// nodo en el canvas no movía el marcador. Todo lo demás —geometría, curvas, fold— es el original.
import { isValidElement, useLayoutEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import './BranchedMenu.css'

const PAD = 6
const MARK = 32

const renderIcon = icon => (isValidElement(icon) ? icon : <HugeiconsIcon icon={icon} size={16} strokeWidth={1.8} />)
const toSet = open => new Set(Array.isArray(open) ? open : open >= 0 ? [open] : [])

export default function BranchedMenu({
  items,
  defaultOpen = 0,
  defaultActive = '',
  active: activeControlada,
  onSelect,
  onToggle,
  color = '#f5f5f5',
  accentColor = '#f5f5f5',
  lineColor = '#3f3f46',
  width = 240,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  foldDuration = 300,
  className = ''
}) {
  const [open, setOpen] = useState(() => toSet(defaultOpen))
  const [activeInterna, setActiveInterna] = useState(() => {
    if (defaultActive) return defaultActive
    const first = items.find((it, i) => it.children && toSet(defaultOpen).has(i))
    return first?.children?.[0]?.value ?? ''
  })
  const active = activeControlada ?? activeInterna
  const navRef = useRef(null)
  const heads = useRef([])
  const markerRef = useRef(null)
  const latest = useRef({})
  latest.current = { onSelect, onToggle }

  const activeSection = items.findIndex(it => it.children?.some(kid => kid.value === active))
  // El original solo prende el marcador junto a una SECCIÓN con hijo activo. Acá la mayoría de
  // los items son hojas de primer nivel (sin hijos, como Obras) — sin esto el marcador nunca
  // aparecía en ese caso, que es el más común en esta app.
  const activeLeaf = items.findIndex(it => !it.children && (it.value ?? it.label) === active)
  const marcado = activeSection >= 0 ? activeSection : activeLeaf
  const markerShown = marcado >= 0 && (activeSection < 0 || open.has(activeSection))
  useLayoutEffect(() => {
    const place = glide => {
      const m = markerRef.current
      const el = heads.current[marcado]
      if (!m) return
      const on = markerShown && el
      if (!glide) m.style.transition = 'none'
      if (on) m.style.top = `${el.offsetTop + (el.offsetHeight - MARK) / 2}px`
      m.toggleAttribute('data-on', Boolean(on))
      if (!glide) {
        void m.offsetHeight
        m.style.transition = ''
      }
    }
    place(true)
    let first = true
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false
        return
      }
      place(false)
    })
    if (navRef.current) ro.observe(navRef.current)
    return () => ro.disconnect()
  }, [marcado, markerShown, items, fontSize, rowHeight])

  // Si el foco cambió por navegación (URL/canvas), no por un click acá, hay que abrir la sección
  // que lo contiene o el marcador queda apagado (isOpen en falso lo esconde).
  useLayoutEffect(() => {
    if (activeSection >= 0 && !open.has(activeSection)) {
      setOpen(prev => new Set(prev).add(activeSection))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const select = (value, item) => {
    setActiveInterna(value)
    latest.current.onSelect?.(value, item)
  }
  const toggle = i => {
    setOpen(prev => {
      const next = new Set(prev)
      const isOpen = !next.has(i)
      if (isOpen) next.add(i)
      else next.delete(i)
      latest.current.onToggle?.(i, isOpen)
      return next
    })
  }

  const r = Math.min(radius, rowHeight / 2 - 2)
  const endX = indent - 8
  const rowY = k => PAD + k * rowHeight + rowHeight / 2
  const branch = k => `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`
  const reach = k => `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`
  const length = k => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r)

  return (
    <nav
      ref={navRef}
      className={`branched-menu${className ? ` ${className}` : ''}`}
      style={{
        '--bm-w': `${width}px`,
        '--bm-ink': color,
        '--bm-accent': accentColor,
        '--bm-line': lineColor,
        '--bm-font': `${fontSize}px`,
        '--bm-row': `${rowHeight}px`,
        '--bm-indent': `${indent}px`,
        '--bm-line-w': lineWidth,
        '--bm-draw': `${drawDuration}ms`,
        '--bm-fold': `${foldDuration}ms`
      }}
    >
      <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
      {items.map((item, i) => {
        const kids = item.children
        const isOpen = kids ? open.has(i) : false
        const leafValue = item.value ?? item.label
        const leafActive = !kids && leafValue === active
        const bodyH = kids ? PAD * 2 + kids.length * rowHeight : 0
        return (
          <div key={item.value ?? item.label} className="branched-menu__section" data-open={isOpen ? '' : undefined}>
            <button
              ref={el => {
                heads.current[i] = el
              }}
              type="button"
              className="branched-menu__head"
              aria-expanded={kids ? isOpen : undefined}
              aria-current={leafActive ? 'true' : undefined}
              data-active={leafActive ? '' : undefined}
              onClick={() => (kids ? toggle(i) : select(leafValue, item))}
            >
              {item.label}
            </button>
            {kids ? (
              <div className="branched-menu__body">
                <div className="branched-menu__fold">
                  <div className="branched-menu__tree" style={{ height: bodyH }}>
                    <svg className="branched-menu__lines" width={indent} height={bodyH} aria-hidden="true">
                      <path className="branched-menu__base" d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`} />
                      {kids.map((kid, k) => (
                        <path key={kid.value} className="branched-menu__base" d={branch(k)} />
                      ))}
                      {kids.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="branched-menu__reach"
                          d={reach(k)}
                          style={{
                            strokeDasharray: length(k),
                            strokeDashoffset: kid.value === active ? 0 : length(k)
                          }}
                        />
                      ))}
                    </svg>
                    {kids.map(kid => (
                      <button
                        key={kid.value}
                        type="button"
                        className="branched-menu__item"
                        aria-current={kid.value === active ? 'true' : undefined}
                        data-active={kid.value === active ? '' : undefined}
                        tabIndex={isOpen ? 0 : -1}
                        onClick={() => select(kid.value, kid)}
                      >
                        {kid.icon ? (
                          <span className="branched-menu__icon" aria-hidden="true">
                            {renderIcon(kid.icon)}
                          </span>
                        ) : null}
                        <span className="branched-menu__label">{kid.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
