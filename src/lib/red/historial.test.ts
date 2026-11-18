import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOPE_HISTORIAL, pasosAtras, registrar, etiquetaDe } from './historial.ts'

const A = '/'
const B = '/entidad/tropical-poncho?red=tropical-poncho'
const C = '/entidad/obras?red=tropical-poncho'
const D = '/obra/soma?red=soma'

test('pasosAtras: del más reciente al más viejo, con delta negativo', () => {
  assert.deepEqual(pasosAtras([A, B, C, D], 3), [
    { url: C, delta: -1 },
    { url: B, delta: -2 },
    { url: A, delta: -3 },
  ])
})
test('pasosAtras: sin pasado no hay pasos; adelante no cuenta', () => {
  assert.deepEqual(pasosAtras([A], 0), [])
  assert.deepEqual(pasosAtras([A, B, C], 1), [{ url: A, delta: -1 }]) // C queda adelante
})
test('pasosAtras: la URL actual no es destino y las repetidas dejan la más cercana', () => {
  // A B A C B (actual): sin la B de ahora, sin la A vieja
  assert.deepEqual(pasosAtras([A, B, A, C, B], 4), [
    { url: C, delta: -1 },
    { url: A, delta: -2 },
  ])
  assert.deepEqual(pasosAtras([A, A, B], 2), [{ url: A, delta: -1 }]) // consecutivas
})
test('pasosAtras: salta lo desconocido y lo que no es de la app', () => {
  assert.deepEqual(pasosAtras([undefined, '/api/topologia', '/otra', C, D], 4), [{ url: C, delta: -1 }])
  assert.deepEqual(pasosAtras(['/?red=_', D], 1), [{ url: '/?red=_', delta: -1 }])
})
test('pasosAtras: tope, descarta lo más viejo', () => {
  const urls = Array.from({ length: 40 }, (_, i) => `/entidad/n${i}`)
  const p = pasosAtras(urls, 39)
  assert.equal(p.length, TOPE_HISTORIAL)
  assert.equal(p[0].url, '/entidad/n38')
  assert.equal(p.at(-1)!.url, `/entidad/n${39 - TOPE_HISTORIAL}`)
  assert.equal(pasosAtras(urls, 39, 3).length, 3)
})

test('registrar: agrega al final y navegar descarta lo de adelante', () => {
  assert.deepEqual(registrar([A], 1, B), [A, B])
  assert.deepEqual(registrar([A, B, C], 1, D), [A, D]) // se volvió a B y se navegó: C se pierde
})
test('registrar: no muta y tolera huecos (recarga sin Navigation API)', () => {
  const antes = [A, B]
  registrar(antes, 1, C)
  assert.deepEqual(antes, [A, B])
  const r = registrar([], 3, D)
  assert.equal(r.length, 4)
  assert.equal(r[3], D)
  assert.deepEqual(pasosAtras(r, 3), []) // los huecos no son destinos
})

const nombres: Record<string, string> = { 'tropical-poncho': 'Tropical Poncho', obras: 'Obras', soma: 'SOMA', 'rama-cerratto': 'Rama Cerratto' }
const nombreDe = (s: string) => nombres[s]
test('etiquetaDe: nombre de la red y del foco, derivados de los datos', () => {
  assert.equal(etiquetaDe('/', nombreDe), 'Sinápsis')
  assert.equal(etiquetaDe('/?semilla=x', nombreDe), 'Sinápsis')
  assert.equal(etiquetaDe('/entidad/rama-cerratto?red=rama-cerratto', nombreDe), 'Rama Cerratto') // red = foco: solo el nombre
  assert.equal(etiquetaDe('/entidad/rama-cerratto', nombreDe), 'Rama Cerratto') // sin ?red= la red es el foco
  assert.equal(etiquetaDe('/entidad/obras?red=tropical-poncho', nombreDe), 'Tropical Poncho › Obras')
  assert.equal(etiquetaDe('/obra/soma?red=_', nombreDe), 'SOMA') // sin red
  assert.equal(etiquetaDe('/?red=tropical-poncho', nombreDe), 'Tropical Poncho')
})
test('etiquetaDe: slug inexistente no tiene etiqueta', () => {
  assert.equal(etiquetaDe('/entidad/nada?red=tropical-poncho', nombreDe), null)
  assert.equal(etiquetaDe('/entidad/obras?red=nada', nombreDe), 'Obras') // red perdida: queda el foco
})
