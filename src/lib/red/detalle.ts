// Borde de confianza (D-13): el metadata de la base es "data profunda" y arrastra basura del
// sitio legado (mongoId, fuente, graphVal, HTML). Solo salen estas cuatro claves, validadas.
// Nunca lanza; el texto se renderiza como texto plano, jamás como HTML.

export interface DetalleNodo {
  texto?: string
  galeria?: { thumb: string; alt?: string }[]
  enlaces?: { etiqueta: string; url: string }[]
  youtube?: string
}

const THUMB = /^[a-z0-9_\-/]+\.(png|jpe?g|webp|gif)$/
const esObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

function thumbOk(t: unknown): t is string {
  return typeof t === 'string' && THUMB.test(t) && !t.includes('..') && !t.includes('//') && !t.startsWith('/')
}

function urlOk(u: unknown): u is string {
  if (typeof u !== 'string') return false
  try {
    const { protocol } = new URL(u)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function validarDetalle(raw: unknown): DetalleNodo {
  if (!esObj(raw)) return {}
  const out: DetalleNodo = {}
  if (typeof raw.texto === 'string' && raw.texto) out.texto = raw.texto.slice(0, 5000)
  if (typeof raw.youtube === 'string' && /^[\w-]{11}$/.test(raw.youtube)) out.youtube = raw.youtube
  if (Array.isArray(raw.galeria)) {
    const g = raw.galeria
      .filter((i): i is Record<string, unknown> => esObj(i) && thumbOk(i.thumb))
      .slice(0, 12)
      .map((i) => ({ thumb: i.thumb as string, ...(typeof i.alt === 'string' && { alt: i.alt.slice(0, 120) }) }))
    if (g.length) out.galeria = g
  }
  if (Array.isArray(raw.enlaces)) {
    const e = raw.enlaces
      .filter((i): i is Record<string, unknown> => esObj(i) && urlOk(i.url) && typeof i.etiqueta === 'string' && i.etiqueta.length > 0 && i.etiqueta.length <= 60)
      .slice(0, 10)
      .map((i) => ({ etiqueta: i.etiqueta as string, url: i.url as string }))
    if (e.length) out.enlaces = e
  }
  return out
}
