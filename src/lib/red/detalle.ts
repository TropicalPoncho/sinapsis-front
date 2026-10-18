// Borde de confianza (D-13, D-43): el metadata de la base es "data profunda" y arrastra basura del sitio legado
// (mongoId, bio, info, HTML). Solo sale lo que proyecta `metadata.ficha`, validado: bloques de contenido y Entradas.
// Es el único validador, para la API (lectura) y para el import (escritura, con `descartes`). Nunca lanza;
// el texto se renderiza siempre como texto plano. Sin imports: `importar.ts` lo carga con strip-types.

export type TipoBloque = 'texto' | 'galeria' | 'video' | 'enlaces'
export interface BloqueDef { id: string; nombre: string; tipo: TipoBloque }
// ponytail: `ficha.bloques` reemplaza la lista entera del tipo, no se mezcla. Si en M2 hace falta "el default más un bloque",
// la salida es un campo de agregado, no mezclar en silencio.
export type Bloque = { id: string; nombre: string } & (
  | { tipo: 'texto'; texto: string }
  | { tipo: 'galeria'; imagenes: { thumb: string; alt?: string }[] }
  | { tipo: 'video'; youtube: string }
  | { tipo: 'enlaces'; enlaces: { etiqueta: string; url: string }[] }
)
export interface Entradas { texto?: string; url?: string; etiqueta?: string }
export interface DetalleNodo { bloques: Bloque[]; entradas?: Entradas }

const TIPOS = new Set<string>(['texto', 'galeria', 'video', 'enlaces'])
const THUMB = /^[a-z0-9_\-/]+\.(png|jpe?g|webp|gif)$/
const ID_BLOQUE = /^[a-z0-9-]{1,32}$/
// El texto se renderiza siempre como texto (React escapa); esto ataja el HTML pegado del sitio viejo.
const HTML = /<\/?[a-z!][^>]*>/i
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

// Horario del evento ("22–04hs"): viaja en la topología (D-44), así que tiene tope propio. Lo usan el import y /api/topologia.
export const horarioOk = (h: unknown): h is string => typeof h === 'string' && h.length >= 1 && h.length <= 40 && !HTML.test(h)

// Esquema por defecto de un nodo: gana `NODETYPE:subtipo`, después `NODETYPE`, si no vacío.
export function esquemaDe(config: Record<string, BloqueDef[]>, nodeType: string, subtipo: string): BloqueDef[] {
  return config[`${nodeType}:${subtipo}`] ?? config[nodeType] ?? []
}

export function validarDetalle(metadata: unknown, porDefecto: BloqueDef[], descartes?: string[]): DetalleNodo {
  const out: DetalleNodo = { bloques: [] }
  const ficha = esObj(metadata) && esObj(metadata.ficha) ? metadata.ficha : null
  if (!ficha) return out
  const d = (motivo: string) => { descartes?.push(motivo) }
  for (const k of Object.keys(ficha)) if (!['bloques', 'contenido', 'horario', 'entradas'].includes(k)) d(`ficha.${k}: clave desconocida`)

  // texto plano de 1..max; sobre el tope se corta y se avisa, con HTML se descarta
  const texto = (v: unknown, max: number, donde: string): string | undefined => {
    if (typeof v !== 'string' || !v) { d(`${donde}: no es un texto`); return undefined }
    if (HTML.test(v)) { d(`${donde}: tiene HTML`); return undefined }
    if (v.length > max) d(`${donde}: texto de más de ${max} caracteres, cortado`)
    return v.slice(0, max)
  }
  const nombreOk = (v: unknown, max: number): v is string => typeof v === 'string' && v.length >= 1 && v.length <= max && !HTML.test(v)
  const nombre = (v: unknown, max: number, donde: string): string | undefined =>
    nombreOk(v, max) ? v : (d(`${donde}: debe ser un texto de 1 a ${max} sin HTML`), undefined)

  // esquema efectivo: el override del nodo (válido, hasta 12, sin ids repetidos) o el del tipo
  let esquema = porDefecto
  if (Array.isArray(ficha.bloques)) {
    esquema = []
    for (const b of ficha.bloques) {
      const id = esObj(b) ? b.id : undefined
      const nom = esObj(b) ? nombre(b.nombre, 40, `bloques[${String(id)}].nombre`) : undefined
      if (!esObj(b) || typeof id !== 'string' || !ID_BLOQUE.test(id) || !nom || !TIPOS.has(b.tipo as string)) { d(`bloques: definición inválida (${JSON.stringify(id)})`); continue }
      if (esquema.some((e) => e.id === id)) { d(`bloques[${id}]: id repetido`); continue }
      if (esquema.length >= 12) { d(`bloques[${id}]: más de 12 bloques`); continue }
      esquema.push({ id, nombre: nom, tipo: b.tipo as TipoBloque })
    }
  } else if (ficha.bloques !== undefined) d('bloques: no es una lista')

  const contenido = esObj(ficha.contenido) ? ficha.contenido : {}
  if (ficha.contenido !== undefined && !esObj(ficha.contenido)) d('contenido: no es un objeto')
  for (const id of Object.keys(contenido)) if (!esquema.some((e) => e.id === id)) d(`contenido.${id}: el nodo no tiene un bloque con ese id`)

  for (const def of esquema) {
    const v = contenido[def.id]
    if (v === undefined) continue
    const donde = `contenido.${def.id}`
    const base = { id: def.id, nombre: def.nombre }
    if (def.tipo === 'texto') {
      const t = texto(v, 5000, donde)
      if (t) out.bloques.push({ ...base, tipo: 'texto', texto: t })
    } else if (def.tipo === 'video') {
      if (typeof v === 'string' && /^[\w-]{11}$/.test(v)) out.bloques.push({ ...base, tipo: 'video', youtube: v })
      else d(`${donde}: no es un id de YouTube de 11 caracteres`)
    } else if (!Array.isArray(v)) {
      d(`${donde}: no es una lista`)
    } else if (def.tipo === 'galeria') {
      if (v.length > 12) d(`${donde}: más de 12 imágenes, cortada`)
      const imagenes = v.slice(0, 12).flatMap((i, n): { thumb: string; alt?: string }[] => {
        if (!esObj(i) || !thumbOk(i.thumb)) { d(`${donde}[${n}]: thumb inválido (clave relativa en minúscula)`); return [] }
        if (i.alt === undefined) return [{ thumb: i.thumb }]
        const alt = texto(i.alt, 120, `${donde}[${n}].alt`)
        return [{ thumb: i.thumb, ...(alt && { alt }) }]
      })
      if (imagenes.length) out.bloques.push({ ...base, tipo: 'galeria', imagenes })
    } else {
      if (v.length > 10) d(`${donde}: más de 10 enlaces, cortada`)
      const enlaces = v.slice(0, 10).flatMap((i, n): { etiqueta: string; url: string }[] => {
        if (!esObj(i) || !nombreOk(i.etiqueta, 60) || !urlOk(i.url)) { d(`${donde}[${n}]: enlace inválido (etiqueta 1-60 sin HTML y url http/https)`); return [] }
        return [{ etiqueta: i.etiqueta, url: i.url }]
      })
      if (enlaces.length) out.bloques.push({ ...base, tipo: 'enlaces', enlaces })
    }
  }

  if (ficha.entradas !== undefined) {
    if (!esObj(ficha.entradas)) d('entradas: no es un objeto')
    else {
      const e = ficha.entradas
      const t = e.texto === undefined ? undefined : texto(e.texto, 280, 'entradas.texto')
      const url = e.url === undefined ? undefined : urlOk(e.url) ? e.url : (d('entradas.url: debe ser http/https'), undefined)
      const etiqueta = url && e.etiqueta !== undefined ? nombre(e.etiqueta, 60, 'entradas.etiqueta') : undefined
      if (t || url) out.entradas = { ...(t && { texto: t }), ...(url && { url }), ...(etiqueta && { etiqueta }) }
    }
  }
  return out
}
