import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esFuturo, fechaLarga, hoyLocal } from './fechas.ts'

test('esFuturo: el día del evento cuenta, el siguiente no', () => {
  const f = '2026-10-31T00:00:00.000Z'
  assert.equal(esFuturo(f, '2026-10-18'), true)
  assert.equal(esFuturo(f, '2026-10-31'), true)
  assert.equal(esFuturo(f, '2026-11-01'), false)
  assert.equal(esFuturo(undefined, '2026-10-18'), false)
})

test('fechaLarga: con día sin año, sin día con año, inválida null', () => {
  assert.match(fechaLarga('2026-10-31T00:00:00.000Z', true)!, /^sábado,? 31 de octubre$/)
  assert.equal(fechaLarga('2023-01-21T00:00:00.000Z'), '21 de enero de 2023')
  assert.equal(fechaLarga('no es una fecha'), null)
  assert.equal(fechaLarga(undefined), null)
})

test('hoyLocal tiene la forma YYYY-MM-DD', () => {
  assert.match(hoyLocal(), /^\d{4}-\d{2}-\d{2}$/)
})
