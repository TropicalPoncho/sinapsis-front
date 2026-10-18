import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { esquemaDe, validarDetalle } from './detalle.ts'
import type { BloqueDef } from './detalle.ts'

const CUR: BloqueDef = { id: 'curaduria', nombre: 'Curaduría', tipo: 'texto' }
const GAL: BloqueDef = { id: 'galeria', nombre: 'Galería', tipo: 'galeria' }
const VID: BloqueDef = { id: 'video', nombre: 'Video', tipo: 'video' }
const ENL: BloqueDef = { id: 'enlaces', nombre: 'Enlaces', tipo: 'enlaces' }
const TODOS = [CUR, GAL, VID, ENL]
const ficha = (contenido: unknown, resto: object = {}) => ({ ficha: { contenido, ...resto } })

test('sin ficha o no objeto da { bloques: [] }', () => {
  for (const x of [null, 'x', {}, [], 3, { ficha: 'x' }, { ficha: [] }]) assert.deepEqual(validarDetalle(x, TODOS), { bloques: [] })
})

test('lo legado no sale: ni mongoId, bio, info ni las cuatro claves sueltas de antes', () => {
  const r = validarDetalle({ mongoId: 'x', bio: '<b>x</b>', info: 'y', texto: 'a', youtube: 'dQw4w9WgXcQ', galeria: [], enlaces: [], ...ficha({ curaduria: 'hola' }) }, [CUR])
  assert.deepEqual(r, { bloques: [{ id: 'curaduria', nombre: 'Curaduría', tipo: 'texto', texto: 'hola' }] })
  assert.deepEqual(Object.keys(r), ['bloques'])
})

test('un solo bloque con el esquema por defecto', () => {
  const r = validarDetalle(ficha({ curaduria: 'Un texto' }), [CUR, GAL])
  assert.deepEqual(r.bloques, [{ id: 'curaduria', nombre: 'Curaduría', tipo: 'texto', texto: 'Un texto' }])
})

test('ficha.bloques reemplaza el esquema; el contenido de un id fuera del esquema efectivo queda en descartes', () => {
  const descartes: string[] = []
  const r = validarDetalle(
    ficha({ galeria: [{ thumb: 'obras/nudo.png' }], notas: 'a', curaduria: 'x' }, { bloques: [{ id: 'notas', nombre: 'Notas', tipo: 'texto' }, { id: 'galeria', nombre: 'Fotos', tipo: 'galeria' }] }),
    [CUR],
    descartes,
  )
  assert.deepEqual(r.bloques.map((b) => [b.id, b.nombre]), [['notas', 'Notas'], ['galeria', 'Fotos']])
  assert.equal(descartes.length, 1)
  assert.match(descartes[0], /contenido\.curaduria/)
})

test('definiciones de bloque inválidas se descartan', () => {
  const descartes: string[] = []
  const bloques = [
    { id: 'MAYUS', nombre: 'a', tipo: 'texto' },
    { id: 'ok', nombre: 'a', tipo: 'entradas' },
    { id: 'html', nombre: '<b>a</b>', tipo: 'texto' },
    { id: 'largo', nombre: 'x'.repeat(41), tipo: 'texto' },
    { id: 'x'.repeat(33), nombre: 'a', tipo: 'texto' },
    { id: 'bien', nombre: 'Bien', tipo: 'texto' },
    { id: 'bien', nombre: 'Repetido', tipo: 'texto' },
  ]
  const r = validarDetalle(ficha({ bien: 'hola' }, { bloques }), [], descartes)
  assert.deepEqual(r.bloques.map((b) => b.id), ['bien'])
  assert.ok(descartes.length >= 6)
})

test('youtube', () => {
  const v = (youtube: unknown) => validarDetalle(ficha({ video: youtube }), [VID]).bloques
  assert.equal((v('dQw4w9WgXcQ')[0] as { youtube: string }).youtube, 'dQw4w9WgXcQ')
  assert.equal(v('dQw4w9WgXcQ"><script>').length, 0)
  assert.equal(v('corto').length, 0)
})

test('enlaces', () => {
  const descartes: string[] = []
  const r = validarDetalle(ficha({
    enlaces: [
      { etiqueta: 'a', url: 'javascript:alert(1)' },
      { etiqueta: 'b', url: 'ftp://x' },
      { etiqueta: 'ok', url: 'https://tropicalponcho.art' },
      { etiqueta: 'ok2', url: 'http://x.org' },
      { etiqueta: '', url: 'https://x.org' },
      { etiqueta: 'x'.repeat(61), url: 'https://x.org' },
      { etiqueta: '<i>h</i>', url: 'https://x.org' },
    ],
  }), [ENL], descartes)
  const b = r.bloques[0]
  assert.ok(b.tipo === 'enlaces')
  assert.deepEqual(b.enlaces.map((e) => e.etiqueta), ['ok', 'ok2'])
  assert.equal(descartes.length, 5)
})

test('galería', () => {
  const thumbs = ['obras/nudo.png', 'https://x/y.png', '../x.png', '/abs.png', 'Obras/Nudo.PNG']
  const b = validarDetalle(ficha({ galeria: thumbs.map((thumb) => ({ thumb, alt: 'a'.repeat(200) })) }), [GAL]).bloques[0]
  assert.ok(b.tipo === 'galeria')
  assert.deepEqual(b.imagenes.map((g) => g.thumb), ['obras/nudo.png'])
  assert.equal(b.imagenes[0].alt?.length, 120)
  const muchas = Array.from({ length: 20 }, () => ({ thumb: 'obras/nudo.png' }))
  const g = validarDetalle(ficha({ galeria: muchas }), [GAL]).bloques[0]
  assert.ok(g.tipo === 'galeria')
  assert.equal(g.imagenes.length, 12)
})

test('texto cortado en 5000 con descarte; HTML y tipos raros fuera', () => {
  const descartes: string[] = []
  const b = validarDetalle(ficha({ curaduria: 'a'.repeat(6000) }), [CUR], descartes).bloques[0]
  assert.ok(b.tipo === 'texto')
  assert.equal(b.texto.length, 5000)
  assert.equal(descartes.length, 1)
  for (const t of ['hola <b>x</b>', 'cierra </p>', 5, '']) assert.equal(validarDetalle(ficha({ curaduria: t }), [CUR]).bloques.length, 0)
  // un signo menor suelto no es HTML
  assert.equal(validarDetalle(ficha({ curaduria: 'a < b y c > d' }), [CUR]).bloques.length, 1)
})

test('entradas', () => {
  const e = (entradas: unknown) => validarDetalle(ficha({}, { entradas }), []).entradas
  assert.deepEqual(e({ texto: 'Entrada $5000' }), { texto: 'Entrada $5000' })
  assert.deepEqual(e({ texto: 'x', url: 'https://t.art', etiqueta: 'Comprar' }), { texto: 'x', url: 'https://t.art', etiqueta: 'Comprar' })
  assert.equal(e({ url: 'javascript:alert(1)' }), undefined)
  assert.deepEqual(e({ texto: 'x', url: 'javascript:alert(1)' }), { texto: 'x' })
  assert.equal(e({ texto: '<b>x</b>' }), undefined)
  assert.equal(e({ texto: 'x'.repeat(300) })?.texto?.length, 280)
  assert.equal(e('Entrada suelta'), undefined)
  // la etiqueta sin url no viaja
  assert.deepEqual(e({ texto: 'x', etiqueta: 'Comprar' }), { texto: 'x' })
})

test('esquemaDe: gana el subtipo, después el tipo, si no vacío', () => {
  const config = { OBRA: [GAL], 'OBRA:video': [VID] }
  assert.deepEqual(esquemaDe(config, 'OBRA', 'video'), [VID])
  assert.deepEqual(esquemaDe(config, 'OBRA', 'pintura'), [GAL])
  assert.deepEqual(esquemaDe(config, 'ENTIDAD', 'persona'), [])
})

test('datos reales: fichas.json con bloques.json pasa el borde sin tocar el texto ni descartar nada', () => {
  const fichas = JSON.parse(fs.readFileSync('data/curaduria/fichas.json', 'utf8')) as Record<string, { _nodo: string; contenido: Record<string, string>; entradas?: { texto: string } }>
  const config = JSON.parse(fs.readFileSync('src/lib/red/bloques.json', 'utf8')) as Record<string, BloqueDef[]>
  const alterego = fichas['a1f4a49600ffbdbf34f68ede']
  assert.equal(alterego._nodo, 'Alterego')
  const descartes: string[] = []
  const { _nodo, ...entrada } = alterego
  const r = validarDetalle({ ficha: entrada }, esquemaDe(config, 'EVENTO', 'fiesta'), descartes)
  assert.deepEqual(descartes, [])
  assert.equal(r.bloques.length, 1)
  const b = r.bloques[0]
  assert.ok(b.tipo === 'texto')
  assert.equal(b.nombre, 'Curaduría')
  assert.equal(b.texto, alterego.contenido.curaduria)
  assert.equal(r.entradas?.texto, alterego.entradas?.texto)
  assert.equal(_nodo, 'Alterego')
})
