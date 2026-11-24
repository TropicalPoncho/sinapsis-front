// D-52: la estructura que crece con el tiempo es una función pura de (semilla, versión, paso). Estos tests la congelan.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mulberry32 } from './prng.ts'
import { generar, VERSION } from './dendrita.ts'
import type { Estructura } from './dendrita.ts'
import { estructuraDe, hastaPaso } from './estructura.ts'
import { SEGMENTOS_MAX, validarCrecimiento } from './config.ts'
import { offsetDeCabeceras, pasosEn, perillasDe, suave, tiempoDe } from './tiempo.ts'

const SEMILLA = 20261205
const bytes = (a: ArrayBufferView) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
const iguales = (a: ArrayBufferView, b: ArrayBufferView) => Buffer.compare(bytes(a), bytes(b)) === 0
// FNV-1a 32 bits sobre todos los arreglos de la estructura, en orden.
const hash = (e: Estructura) => {
  let h = 0x811c9dc5
  for (const a of [e.pos, e.padre, e.a, e.b, e.paso, e.vertices]) for (const x of bytes(a)) { h ^= x; h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16)
}

test('PRNG: misma semilla, misma secuencia; otra semilla, otra; en [0,1)', () => {
  const a = mulberry32(7), b = mulberry32(7), c = mulberry32(8)
  const sa = Array.from({ length: 50 }, a), sb = Array.from({ length: 50 }, b), sc = Array.from({ length: 50 }, c)
  assert.deepEqual(sa, sb)
  assert.notDeepEqual(sa, sc)
  assert.ok(sa.every((x) => x >= 0 && x < 1))
  assert.equal(mulberry32(1)(), 0.6270739405881613) // valor de referencia de mulberry32: si cambia, cambió el PRNG
})

test('determinismo: misma semilla y versión dan los mismos bytes; otra semilla da otra estructura', () => {
  const e1 = generar(SEMILLA, 800), e2 = generar(SEMILLA, 800), e3 = generar(SEMILLA + 1, 800)
  for (const k of ['pos', 'padre', 'a', 'b', 'paso', 'vertices'] as const) assert.ok(iguales(e1[k], e2[k]), k)
  assert.notEqual(hash(e1), hash(e3))
})

test('prefijo: la estructura en el paso k es el prefijo exacto, byte a byte, de la del paso k+1 (y de la de N completo)', () => {
  const N = 1500
  const completa = generar(SEMILLA, N)
  assert.equal(completa.a.length, N)
  for (const k of [1, 2, 49, 50, 333, 1000, 1499]) {
    // Generada con tope k (no solo recortada): nada de lo que se decide depende del tope.
    const parcial = generar(SEMILLA, k)
    const p = hastaPaso(completa, k)
    assert.equal(parcial.a.length, k)
    assert.ok(iguales(parcial.a, p.a), `a @${k}`)
    assert.ok(iguales(parcial.b, p.b), `b @${k}`)
    assert.ok(iguales(parcial.paso, p.paso), `paso @${k}`)
    assert.ok(iguales(parcial.pos, p.pos), `pos @${k}`)
    assert.ok(iguales(parcial.padre, p.padre), `padre @${k}`)
    assert.ok(iguales(parcial.vertices, completa.vertices.subarray(0, k + 1)), `vertices @${k}`)
  }
  // k ⊂ k+1 sobre la misma estructura: cada paso agrega al final y no mueve nada.
  for (const k of [0, 10, 700]) {
    const a = hastaPaso(completa, k), b = hastaPaso(completa, k + 1)
    assert.ok(iguales(a.pos, b.pos.subarray(0, a.pos.length)) && iguales(a.a, b.a.subarray(0, k)) && iguales(a.b, b.b.subarray(0, k)))
  }
})

test('forma: dos raíces, cada segmento nace un paso a la vez, solo conecta lo que ya existe, y todo queda en el elipsoide', () => {
  const e = generar(SEMILLA, 1500)
  assert.deepEqual([...e.pos.subarray(0, 6)], [-1, 0, 0, 1, 0, 0])
  assert.deepEqual([e.padre[0], e.padre[1]], [-1, -1])
  assert.deepEqual([...e.paso.subarray(0, 4)], [1, 2, 3, 4])
  for (let s = 0; s < e.a.length; s++) {
    const existen = e.vertices[s + 1] // vértices al completarse el segmento s
    assert.ok(e.a[s] < existen && e.b[s] < existen, `segmento ${s}`)
    assert.notEqual(e.a[s], e.b[s])
  }
  for (let v = 2; v < e.padre.length; v++) assert.ok(e.padre[v] >= 0 && e.padre[v] < v, `padre ${v}`)
  const uniones = e.a.length - (e.pos.length / 3 - 2)
  assert.ok(uniones > 0, 'hay uniones (celdas cerradas)')
  for (let v = 0; v < e.pos.length; v += 3) assert.ok(e.pos[v] ** 2 / 1.5 ** 2 + e.pos[v + 1] ** 2 / 1.1 ** 2 + e.pos[v + 2] ** 2 / 0.5 ** 2 <= 1, `vértice ${v / 3} fuera del elipsoide`)
})

test('test de oro: dendrita-v1, semilla 20261205, 1500 pasos. Si rompe, alguien tocó el algoritmo sin subir la versión', () => {
  assert.equal(VERSION, 'dendrita-v1')
  // Para cambiar este hash hay que crear dendrita-v2: los sitios publicados siguen con v1 (D-52).
  assert.equal(hash(generar(SEMILLA, 1500)), '1edacdcc')
})

test('tope de segmentos: nunca más que n, y n no pasa de SEGMENTOS_MAX', () => {
  assert.equal(generar(SEMILLA, 300).a.length, 300)
  assert.equal(SEGMENTOS_MAX, 6000)
  const e = generar(SEMILLA, SEGMENTOS_MAX)
  assert.ok(e.a.length <= SEGMENTOS_MAX)
  assert.ok(e.pos.length / 3 <= SEGMENTOS_MAX + 2)
  assert.equal(validarCrecimiento({ ...BUENA, n: SEGMENTOS_MAX + 1 }), null)
})

test('la estructura de una config se genera una vez (caché) y se recalcula si cambia', () => {
  const c = { algoritmo: 'dendrita-v1' as const, semilla: SEMILLA, n: 200 }
  assert.equal(estructuraDe(c), estructuraDe(c))
  assert.notEqual(estructuraDe({ ...c, n: 201 }), estructuraDe(c))
})

test('determinismo entre navegadores: la lógica de decisión no usa Math.random, trigonometría, exp ni pow', () => {
  for (const f of ['dendrita.ts', 'prng.ts', 'tiempo.ts', 'estructura.ts']) {
    const codigo = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
    assert.doesNotMatch(codigo, /Math\.(random|sin|cos|tan|asin|acos|atan2?|sinh|cosh|tanh|exp|expm1|pow|log|log2|log10|log1p|hypot|cbrt)\b/, f)
    assert.doesNotMatch(codigo, /\*\*/, `${f}: el operador ** es pow`)
  }
})

const BUENA = { semilla: SEMILLA, algoritmo: 'dendrita-v1', inicio: '2026-11-25T00:00:00-03:00', fin: '2026-12-05T00:00:00-03:00', n: 5000, raices: ['tp', 'bg'] }

test('pasos(t): monótono, 0 antes del inicio, n desde el fin, suave sin saltos', () => {
  const i = Date.parse(BUENA.inicio), f = Date.parse(BUENA.fin)
  assert.equal(pasosEn(BUENA, i - 1e9), 0)
  assert.equal(pasosEn(BUENA, i), 0)
  assert.equal(pasosEn(BUENA, f), 5000)
  assert.equal(pasosEn(BUENA, f + 1e9), 5000)
  let previo = -1
  for (let k = 0; k <= 2000; k++) {
    const p = pasosEn(BUENA, i - 1e8 + (k * (f - i + 2e8)) / 2000)
    assert.ok(p >= previo, `retrocede en ${k}`)
    assert.ok(p >= 0 && p <= 5000)
    previo = p
  }
  assert.equal(suave(0.5), 0.5)
  // Un minuto después de un paso, el siguiente: la diferencia entre minutos vecinos es chica (crece continuo, sin saltos).
  assert.ok(pasosEn(BUENA, i + 5 * 86400000 + 60000) - pasosEn(BUENA, i + 5 * 86400000) < 1)
  // Mismo recorrido hoy o mañana: un paso más, nunca otra trayectoria.
  assert.ok(Math.floor(pasosEn(BUENA, Date.parse('2026-11-26T12:00:00-03:00'))) < Math.floor(pasosEn(BUENA, Date.parse('2026-11-27T12:00:00-03:00'))))
})

test('perillas: ?t= (ISO) y ?dia=N pisan el reloj; sin perillas manda el reloj', () => {
  const ahora = Date.parse('2026-11-28T00:00:00-03:00')
  assert.equal(tiempoDe(BUENA, perillasDe(''), ahora), ahora)
  assert.equal(tiempoDe(BUENA, perillasDe('?t=2026-12-01T12:00:00-03:00'), ahora), Date.parse('2026-12-01T12:00:00-03:00'))
  assert.equal(tiempoDe(BUENA, perillasDe('?dia=5'), ahora), Date.parse(BUENA.inicio) + 5 * 86400000)
  assert.equal(tiempoDe(BUENA, perillasDe('?dia=0.5'), ahora), Date.parse(BUENA.inicio) + 43200000)
  assert.equal(tiempoDe(BUENA, perillasDe('?t=basura&dia='), ahora), ahora)
  assert.equal(tiempoDe(BUENA, { fraccion: 1, t: 5 }, ahora), Date.parse(BUENA.fin)) // el slider gana
})

test('reloj: el offset sale de la cabecera Date del servidor, no de la hora del cliente', () => {
  const cliente = Date.parse('2026-11-24T10:00:00Z')
  assert.equal(offsetDeCabeceras('Tue, 24 Nov 2026 10:00:30 GMT', null, cliente), 30000) // el cliente atrasa 30 s
  assert.equal(offsetDeCabeceras('Tue, 24 Nov 2026 10:00:30 GMT', '10', cliente), 40000)
  assert.equal(offsetDeCabeceras(null, null, cliente), 0)
  assert.equal(offsetDeCabeceras('no es una fecha', null, cliente), 0)
})

test('validarCrecimiento: el borde de confianza acepta la config buena y rechaza lo demás con su motivo', () => {
  assert.deepEqual(validarCrecimiento(BUENA), BUENA)
  const mal = (x: unknown) => { const d: string[] = []; assert.equal(validarCrecimiento(x, d), null); return d[0] }
  assert.match(mal(null), /no es un objeto/)
  assert.match(mal({ ...BUENA, extra: 1 }), /clave desconocida/)
  assert.match(mal({ ...BUENA, semilla: 1.5 }), /semilla/)
  assert.match(mal({ ...BUENA, semilla: -1 }), /semilla/)
  assert.match(mal({ ...BUENA, semilla: 2 ** 32 }), /semilla/)
  assert.match(mal({ ...BUENA, algoritmo: 'dendrita-v2' }), /algoritmo/)
  assert.match(mal({ ...BUENA, inicio: '2026-11-25' }), /inicio/)
  assert.match(mal({ ...BUENA, fin: 'mañana' }), /fin/)
  assert.match(mal({ ...BUENA, fin: BUENA.inicio }), /posterior/)
  assert.match(mal({ ...BUENA, n: 0 }), /n debe/)
  assert.match(mal({ ...BUENA, n: 1.5 }), /n debe/)
  assert.match(mal({ ...BUENA, raices: ['a'] }), /raices/)
  assert.match(mal({ ...BUENA, raices: ['a', 'a'] }), /raices/)
  assert.match(mal({ ...BUENA, raices: ['a', '<b>'] }), /raices/)
})
