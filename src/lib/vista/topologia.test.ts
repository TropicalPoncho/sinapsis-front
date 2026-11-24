import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ahoraServidor, cargarAdyacencia, olvidarTopologia } from './topologia.ts'

const ok = { ok: true, headers: new Headers(), json: async () => ({ nodos: [], vinculos: [] }) }

test('reintenta tras un fetch rechazado', async () => {
  olvidarTopologia()
  globalThis.fetch = (async () => { throw new TypeError('network') }) as never
  await assert.rejects(cargarAdyacencia())
  globalThis.fetch = (async () => ok) as never
  assert.ok(await cargarAdyacencia())
})

test('reintenta tras HTTP 503', async () => {
  olvidarTopologia()
  globalThis.fetch = (async () => ({ ok: false, status: 503 })) as never
  await assert.rejects(cargarAdyacencia())
  globalThis.fetch = (async () => ok) as never
  assert.ok(await cargarAdyacencia())
})

test('dos llamadas con éxito hacen un solo fetch', async () => {
  olvidarTopologia()
  let n = 0
  globalThis.fetch = (async () => { n++; return ok }) as never
  await cargarAdyacencia()
  await cargarAdyacencia()
  assert.equal(n, 1)
})

// D-52: la hora de la estructura que crece es la del servidor (cabecera Date de /api/topologia), no la del visitante.
test('ahoraServidor: el reloj sale de la cabecera Date de la topología' + " (cliente atrasado 1 minuto)", async () => {
  olvidarTopologia()
  const adelante = new Date(Date.now() + 60000).toUTCString() // resolución de 1 s
  globalThis.fetch = (async () => ({ ...ok, headers: new Headers({ date: adelante }) })) as never
  await cargarAdyacencia()
  const dif = ahoraServidor() - Date.now()
  assert.ok(dif > 58500 && dif <= 60500, String(dif))
  olvidarTopologia()
  globalThis.fetch = (async () => ok) as never // sin cabecera Date: sin corrección
  await cargarAdyacencia()
  assert.ok(Math.abs(ahoraServidor() - Date.now()) < 50)
})
