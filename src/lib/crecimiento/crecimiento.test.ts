// D-52 / D-53: la estructura que crece con el tiempo es una función pura de (semilla, versión, paso, entradas). Estos tests la congelan.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { azar } from './prng.ts'
import { generar, VERSION } from './dendrita.ts'
import type { Estructura } from './dendrita.ts'
import { estructuraDe, hastaPaso, PASOS_MINI, segmentosHasta } from './estructura.ts'
import { RAICES_MAX, SEGMENTOS_MAX, validarCrecimiento } from './config.ts'
import { offsetDeCabeceras, pasoDeIngreso, pasosEn, perillasDe, suave, tiempoDe } from './tiempo.ts'

const SEMILLA = 20261205
const bytes = (a: ArrayBufferView) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
const iguales = (a: ArrayBufferView, b: ArrayBufferView) => Buffer.compare(bytes(a), bytes(b)) === 0
// FNV-1a 32 bits sobre todos los arreglos de la estructura, en orden.
const hash = (e: Estructura) => {
  let h = 0x811c9dc5
  for (const a of [e.pos, e.padre, e.a, e.b, e.paso, e.vertices, e.posRaices]) for (const x of bytes(a)) { h ^= x; h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16)
}

const BUENA = { semilla: SEMILLA, algoritmo: 'dendrita-v2', inicio: '2026-11-25T00:00:00-03:00', fin: '2026-12-05T00:00:00-03:00', n: 5000, raices: [{ id: 'tp' }, { id: 'bg' }] }
const INGRESO = 600

test('azar: sin estado, misma (semilla, canal, k) mismo número; cualquier cambio de entrada, otro; en [0,1)', () => {
  assert.equal(azar(7, 1, 5), azar(7, 1, 5))
  const muestras = [azar(7, 1, 5), azar(8, 1, 5), azar(7, 2, 5), azar(7, 1, 6)]
  assert.equal(new Set(muestras).size, 4)
  let suma = 0
  for (let k = 0; k < 5000; k++) { const x = azar(SEMILLA, 3, k); assert.ok(x >= 0 && x < 1); suma += x }
  assert.ok(Math.abs(suma / 5000 - 0.5) < 0.02, 'media ~ 0.5') // uniforme, sin sesgo grosero
  assert.equal(azar(1, 1, 1), 0.3703041572589427) // valor de referencia: si cambia, cambió el hash y con él todas las estructuras
})

test('determinismo: misma semilla y versión dan los mismos bytes; otra semilla da otra estructura', () => {
  const e1 = generar(SEMILLA, 800), e2 = generar(SEMILLA, 800), e3 = generar(SEMILLA + 1, 800)
  for (const k of ['pos', 'padre', 'a', 'b', 'paso', 'vertices', 'posRaices'] as const) assert.ok(iguales(e1[k], e2[k]), k)
  assert.notEqual(hash(e1), hash(e3))
  // con una raíz tardía y en la versión pequeña también
  assert.equal(hash(generar(SEMILLA, 800, 'grande', [0, 0, 300])), hash(generar(SEMILLA, 800, 'grande', [0, 0, 300])))
  assert.equal(hash(generar(SEMILLA, 300, 'mini')), hash(generar(SEMILLA, 300, 'mini')))
})

test('prefijo: la estructura en el paso k es el prefijo exacto, byte a byte, de la del paso k+1 (y de la de N completo)', () => {
  const N = 1500
  const completa = generar(SEMILLA, N)
  assert.equal(completa.pasos, N)
  for (const k of [1, 2, 49, 50, 333, 1000, 1499]) {
    // Generada con tope k (no solo recortada): nada de lo que se decide depende del tope.
    const parcial = generar(SEMILLA, k)
    const p = hastaPaso(completa, k)
    assert.equal(parcial.pasos, k)
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
    assert.ok(iguales(a.pos, b.pos.subarray(0, a.pos.length)) && iguales(a.a, b.a.subarray(0, a.a.length)) && iguales(a.b, b.b.subarray(0, a.b.length)))
  }
  // lo mismo para la versión pequeña
  const mini = generar(SEMILLA, 400, 'mini')
  for (const k of [1, 50, 399]) {
    const parcial = generar(SEMILLA, k, 'mini'), p = hastaPaso(mini, k)
    assert.ok(iguales(parcial.a, p.a) && iguales(parcial.b, p.b) && iguales(parcial.pos, p.pos), `mini @${k}`)
  }
})

test('forma: nacen unidas pegadas al núcleo, cada paso agrega un segmento, solo conecta lo que ya existe, y todo queda en el elipsoide', () => {
  const e = generar(SEMILLA, 1500)
  assert.deepEqual([...e.pos.subarray(0, 6)], [-0.14000000059604645, 0, 0, 0.14000000059604645, 0, 0]) // float32 de ±0.14: pegadas al núcleo
  assert.deepEqual([e.padre[0], e.padre[1]], [-1, -1])
  // la unión ya dibujada: un segmento en el paso 0 que une las dos raíces; después uno por paso
  assert.deepEqual([e.a[0], e.b[0], e.paso[0]], [1, 0, 0])
  assert.equal(segmentosHasta(e, 0), 1)
  assert.deepEqual([...e.paso.subarray(0, 4)], [0, 1, 2, 3])
  assert.equal(e.a.length, e.pasos + 1)
  for (let s = 0; s < e.a.length; s++) {
    const existen = e.vertices[e.paso[s]] // vértices al completarse el paso en que aparece el segmento
    assert.ok(e.a[s] < existen && e.b[s] < existen, `segmento ${s}`)
    assert.notEqual(e.a[s], e.b[s])
    if (s > 0) assert.ok(e.paso[s] >= e.paso[s - 1], 'paso no decrece')
  }
  for (let v = 2; v < e.padre.length; v++) assert.ok(e.padre[v] >= 0 && e.padre[v] < v, `padre ${v}`)
  const uniones = e.a.length - 1 - (e.pos.length / 3 - 2)
  assert.ok(uniones > 0, 'hay uniones (celdas cerradas)')
  for (let v = 0; v < e.pos.length; v += 3) assert.ok(e.pos[v] ** 2 / 1.5 ** 2 + e.pos[v + 1] ** 2 / 1.1 ** 2 + e.pos[v + 2] ** 2 / 0.5 ** 2 <= 1, `vértice ${v / 3} fuera del elipsoide`)
})

test('raíz tardía (a): agregarla NO cambia ningún paso anterior a su ingreso, byte a byte', () => {
  const sin = generar(SEMILLA, 1500, 'grande', [0, 0]), con = generar(SEMILLA, 1500, 'grande', [0, 0, INGRESO])
  for (const k of [0, 1, 2, 100, 333, INGRESO - 1]) {
    const x = hastaPaso(sin, k), y = hastaPaso(con, k)
    for (const c of ['a', 'b', 'paso', 'pos', 'padre'] as const) assert.ok(iguales(x[c], y[c]), `${c} @${k}`)
    assert.equal(sin.vertices[k], con.vertices[k], `vertices @${k}`)
  }
  // en el paso de ingreso los segmentos de crecimiento son los mismos; con la raíz hay un vértice y su puente de más
  const a = hastaPaso(sin, INGRESO), b = hastaPaso(con, INGRESO)
  assert.ok(iguales(a.a, b.a.subarray(0, a.a.length)) && iguales(a.b, b.b.subarray(0, a.b.length)))
  assert.equal(b.segmentos, a.segmentos + 1)
  assert.equal(con.vertices[INGRESO], sin.vertices[INGRESO] + 1)
  // y con tope: generar solo hasta el paso previo al ingreso da lo mismo (nada depende de la raíz tardía ni del tope)
  const corta = generar(SEMILLA, INGRESO - 1, 'grande', [0, 0, INGRESO])
  assert.ok(iguales(corta.pos, hastaPaso(sin, INGRESO - 1).pos) && iguales(corta.a, hastaPaso(sin, INGRESO - 1).a))
  // una raíz tardía distinta (otra entrada) tampoco toca lo anterior a la suya
  const otra = generar(SEMILLA, 1500, 'grande', [0, 0, 1200])
  assert.ok(iguales(hastaPaso(otra, 1199).pos, hastaPaso(sin, 1199).pos) && iguales(hastaPaso(otra, 1199).a, hastaPaso(sin, 1199).a))
})

test('raíz tardía (b): crece desde su ingreso, de su propio punto, unida a la estructura', () => {
  const con = generar(SEMILLA, 1500, 'grande', [0, 0, INGRESO])
  const sin = generar(SEMILLA, INGRESO, 'grande', [0, 0])
  const raiz = sin.vertices[INGRESO] // el vértice que se creó al entrar
  assert.deepEqual([...con.pos.subarray(3 * raiz, 3 * raiz + 3)], [...con.posRaices.subarray(6, 9)])
  assert.equal(con.padre[raiz], -1)
  // el puente nace con ella, en el paso de ingreso, y no cuenta como paso
  const puente = [...con.a].findIndex((v, s) => v === raiz && con.paso[s] === INGRESO)
  assert.ok(puente > 0, 'tiene puente al vértice más cercano')
  assert.ok(con.b[puente] < raiz)
  // empieza a crecer en el primer paso después de entrar
  const primero = [...con.a].findIndex((v, s) => v === raiz && s !== puente)
  assert.ok(primero > 0 && con.paso[primero] === INGRESO + 1, `crece en el paso ${INGRESO + 1}`)
  // y de ahí cuelga una rama de verdad, no un solo segmento
  const cuelga = (v: number) => { let u = v; while (u >= 0 && u !== raiz) u = con.padre[u]; return u === raiz }
  let descendientes = 0
  for (let v = raiz + 1; v < con.padre.length; v++) if (cuelga(v)) descendientes++
  assert.ok(descendientes > 20, `la raíz tardía tiene ${descendientes} descendientes`)
  // antes de entrar no existe
  assert.ok(con.vertices[INGRESO - 1] <= raiz)
})

test('raíz tardía: una entrada que el tope no alcanza nunca entra; una de paso 0 nace con la estructura', () => {
  const tarde = generar(SEMILLA, 300, 'grande', [0, 0, 100000])
  assert.equal(tarde.pasos, 300)
  assert.equal(tarde.vertices[300], hastaPaso(generar(SEMILLA, 300), 300).pos.length / 3) // ni un vértice de más
  const temprana = generar(SEMILLA, 300, 'grande', [0, 0, 0])
  assert.equal(temprana.vertices[0], 3)
  assert.equal(segmentosHasta(temprana, 0), 2) // dos puentes, la segunda fundadora y la tercera raíz, cada una unida a lo que ya había
})

test('test de oro: dendrita-v2, semilla 20261205, 1500 pasos. Si rompe, alguien tocó el algoritmo sin subir la versión', () => {
  assert.equal(VERSION, 'dendrita-v2')
  // Para cambiar estos hashes hay que crear dendrita-v3: los sitios publicados siguen con v2 (D-52).
  assert.equal(hash(generar(SEMILLA, 1500)), '6179a71b')
  assert.equal(hash(generar(SEMILLA, 1500, 'grande', [0, 0, INGRESO])), '2cf8755d')
  assert.equal(hash(generar(SEMILLA, 400, 'mini')), '78ff541b')
})

test('mini: misma familia en esfera irregular; la irregularidad sale de la semilla; avanza en proporción a pasos(t)', () => {
  const a = generar(SEMILLA, PASOS_MINI, 'mini'), b = generar(SEMILLA + 1, PASOS_MINI, 'mini')
  assert.equal(a.pasos, PASOS_MINI)
  assert.notEqual(hash(a), hash(b))
  const caja = (e: Estructura) => {
    const mn = [9, 9, 9], mx = [-9, -9, -9]
    for (let v = 0; v < e.pos.length; v += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], e.pos[v + c]); mx[c] = Math.max(mx[c], e.pos[v + c]) }
    return mx.map((x, c) => x - mn[c])
  }
  for (const e of [a, b]) { const [x, y, z] = caja(e); assert.ok(Math.max(x, y, z) < 3 && Math.min(x, y, z) > 0.6, `caja ${[x, y, z]}`) } // ~esférica: sin disco achatado
  assert.notDeepEqual(caja(a).map((x) => x.toFixed(3)), caja(b).map((x) => x.toFixed(3))) // irregular y distinta por semilla
  // mismo reloj: a la mitad del recorrido el nodo mini muestra la mitad de sus pasos, y el grande la mitad de los suyos
  const mitad = pasosEn(BUENA, Date.parse('2026-11-30T00:00:00-03:00'))
  assert.equal(PASOS_MINI * (mitad / BUENA.n), PASOS_MINI / 2)
})

test('tope de segmentos: nunca más que n, y n no pasa de SEGMENTOS_MAX', () => {
  assert.equal(generar(SEMILLA, 300).pasos, 300)
  assert.equal(SEGMENTOS_MAX, 6000)
  const e = generar(SEMILLA, SEGMENTOS_MAX)
  assert.ok(e.pasos <= SEGMENTOS_MAX)
  assert.ok(e.pos.length / 3 <= SEGMENTOS_MAX + 2)
  assert.equal(validarCrecimiento({ ...BUENA, n: SEGMENTOS_MAX + 1 }), null)
})

test('la estructura de una config se genera una vez (caché) y se recalcula si cambia', () => {
  const c = { ...BUENA, algoritmo: 'dendrita-v2' as const, n: 200 }
  assert.equal(estructuraDe(c), estructuraDe(c))
  assert.notEqual(estructuraDe({ ...c, n: 201 }), estructuraDe(c))
  assert.notEqual(estructuraDe(c, 'mini'), estructuraDe(c)) // cada perfil la suya
  assert.equal(estructuraDe(c, 'mini').pasos, PASOS_MINI)
  // una raíz con desde entra en otro paso: otra clave, y la misma config da la misma estructura
  const conTardia = { ...c, raices: [...c.raices, { id: 'x', desde: '2026-11-30T00:00:00-03:00' }] }
  assert.notEqual(estructuraDe(conTardia), estructuraDe(c))
  assert.equal(estructuraDe(conTardia), estructuraDe({ ...conTardia }))
})

test('determinismo entre navegadores: la lógica de decisión no usa Math.random, trigonometría, exp ni pow', () => {
  for (const f of ['dendrita.ts', 'prng.ts', 'tiempo.ts', 'estructura.ts']) {
    const codigo = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
    assert.doesNotMatch(codigo, /Math\.(random|sin|cos|tan|asin|acos|atan2?|sinh|cosh|tanh|exp|expm1|pow|log|log2|log10|log1p|hypot|cbrt)\b/, f)
    assert.doesNotMatch(codigo, /\*\*/, `${f}: el operador ** es pow`)
  }
})

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

test('pasoDeIngreso: sin desde o antes del inicio entra en el paso 0; después, en el paso en que está la estructura ese día', () => {
  assert.equal(pasoDeIngreso(BUENA), 0)
  assert.equal(pasoDeIngreso(BUENA, '2026-11-01T00:00:00-03:00'), 0)
  assert.equal(pasoDeIngreso(BUENA, '2026-11-30T00:00:00-03:00'), 2500) // la mitad del recorrido: smoothstep(0.5) * 5000
  assert.equal(pasoDeIngreso(BUENA, '2026-12-05T00:00:00-03:00'), 5000)
  assert.equal(pasoDeIngreso(BUENA, '2027-01-01T00:00:00-03:00'), 5000) // después del fin: se acota a n
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
  assert.match(mal({ ...BUENA, algoritmo: 'dendrita-v1' }), /algoritmo/) // v1 nunca se publicó
  assert.match(mal({ ...BUENA, inicio: '2026-11-25' }), /inicio/)
  assert.match(mal({ ...BUENA, fin: 'mañana' }), /fin/)
  assert.match(mal({ ...BUENA, fin: BUENA.inicio }), /posterior/)
  assert.match(mal({ ...BUENA, n: 0 }), /n debe/)
  assert.match(mal({ ...BUENA, n: 1.5 }), /n debe/)
  assert.match(mal({ ...BUENA, raices: [{ id: 'a' }] }), /raices debe ser una lista/)
  assert.match(mal({ ...BUENA, raices: ['a', 'b'] }), /raices\[0\] debe ser/) // el formato de v1 (ids sueltos) ya no vale
  assert.match(mal({ ...BUENA, raices: [{ id: 'a' }, { id: 'a' }] }), /id único/)
  assert.match(mal({ ...BUENA, raices: [{ id: 'a' }, { id: '<b>' }] }), /id único/)
  assert.match(mal({ ...BUENA, raices: [{ id: 'a' }, { id: 'b', otra: 1 }] }), /debe ser \{ id, desde\? \}/)
  assert.match(mal({ ...BUENA, raices: [{ id: 'a' }, { id: 'b', desde: '2026-11-30T00:00:00-03:00' }] }), /fundadora/)
  assert.match(mal({ ...BUENA, raices: [{ id: 'a' }, { id: 'b' }, { id: 'c', desde: 'mañana' }] }), /desde/)
  assert.match(mal({ ...BUENA, raices: Array.from({ length: RAICES_MAX + 1 }, (_, i) => ({ id: `r${i}` })) }), /raices debe ser una lista/)
  // una raíz tardía válida pasa, con su desde, y la que no lo trae queda sin la clave
  const conTardia = { ...BUENA, raices: [{ id: 'tp' }, { id: 'bg' }, { id: 'p1', desde: '2026-11-30T00:00:00-03:00' }, { id: 'p2' }] }
  assert.deepEqual(validarCrecimiento(conTardia), conTardia)
})
