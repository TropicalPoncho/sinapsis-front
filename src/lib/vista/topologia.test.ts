import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarAdyacencia, olvidarTopologia } from './topologia.ts'

const ok = { ok: true, json: async () => ({ nodos: [], vinculos: [] }) }

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
