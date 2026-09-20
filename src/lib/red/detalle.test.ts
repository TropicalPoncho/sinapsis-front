import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarDetalle } from './detalle.ts'

test('entradas no objeto dan {}', () => {
  for (const x of [null, 'x', {}, [], 3]) assert.deepEqual(validarDetalle(x), {})
})

test('youtube', () => {
  assert.equal(validarDetalle({ youtube: 'dQw4w9WgXcQ' }).youtube, 'dQw4w9WgXcQ')
  assert.equal(validarDetalle({ youtube: 'dQw4w9WgXcQ"><script>' }).youtube, undefined)
  assert.equal(validarDetalle({ youtube: 'corto' }).youtube, undefined)
})

test('enlaces', () => {
  const r = validarDetalle({
    enlaces: [
      { etiqueta: 'a', url: 'javascript:alert(1)' },
      { etiqueta: 'b', url: 'ftp://x' },
      { etiqueta: 'ok', url: 'https://tropicalponcho.art' },
      { etiqueta: 'ok2', url: 'http://x.org' },
      { etiqueta: '', url: 'https://x.org' },
      { etiqueta: 'x'.repeat(61), url: 'https://x.org' },
    ],
  })
  assert.deepEqual(r.enlaces?.map((e) => e.etiqueta), ['ok', 'ok2'])
})

test('galería', () => {
  const thumbs = ['obras/nudo.png', 'https://x/y.png', '../x.png', '/abs.png', 'Obras/Nudo.PNG']
  const r = validarDetalle({ galeria: thumbs.map((thumb) => ({ thumb, alt: 'a'.repeat(200) })) })
  assert.deepEqual(r.galeria?.map((g) => g.thumb), ['obras/nudo.png'])
  assert.equal(r.galeria?.[0].alt?.length, 120)
  const muchas = Array.from({ length: 20 }, () => ({ thumb: 'obras/nudo.png' }))
  assert.equal(validarDetalle({ galeria: muchas }).galeria?.length, 12)
})

test('texto recortado y claves desconocidas fuera', () => {
  const r = validarDetalle({ texto: 'a'.repeat(6000), mongoId: 'x', fuente: 'y', graphVal: 3 })
  assert.equal(r.texto?.length, 5000)
  assert.deepEqual(Object.keys(r), ['texto'])
})
