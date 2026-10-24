import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FECHA_PARCIAL, esFuturo, fechaLarga, finDe, hoyLocal, periodo, vigente, vigenciaOk } from './fechas.ts'

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

// --- Vigencia de un vínculo (D-49) ---
test('vigenciaOk: forma, calendario y orden', () => {
  assert.equal(vigenciaOk(), true)
  assert.equal(vigenciaOk('', ''), true)
  for (const f of ['2023', '2023-05', '2023-05-31']) assert.equal(vigenciaOk(undefined, f), true, f)
  for (const f of ['2023-13', '2023-02-30', '23', '2023/05', '2023-5']) assert.equal(vigenciaOk(undefined, f), false, f)
  assert.equal(vigenciaOk('2022-05', '2022'), true)
  assert.equal(vigenciaOk('2022-05-10', '2022-03'), false)
  assert.equal(vigenciaOk('2024', '2023-12-31'), false)
  assert.equal(vigenciaOk('2022', '2024'), true)
})

test('finDe lleva al último día del período, solo para comparar', () => {
  assert.equal(finDe('2023'), '2023-12-31')
  assert.equal(finDe('2023-02'), '2023-02-31')
  assert.equal(finDe('2023-05-10'), '2023-05-10')
})

test('vigente: sin hasta o con hasta de hoy en adelante; el día cuenta', () => {
  const hoy = '2026-10-24'
  assert.equal(vigente({}, hoy), true)
  assert.equal(vigente({ hasta: '2023-01-21' }, hoy), false)
  assert.equal(vigente({ hasta: '2026-10-24' }, hoy), true)
  assert.equal(vigente({ hasta: '2026' }, hoy), true)
  assert.equal(vigente({ hasta: '2026-09' }, hoy), false)
})

test('periodo: solo el año, con guion medio si hay desde', () => {
  assert.equal(periodo('2023-01-21'), 'hasta 2023')
  assert.equal(periodo('2024', '2019'), '2019–2024')
  assert.equal(periodo('2023-05', '2023-01'), '2023')
})

test('002_vigencia_vinculos.sql usa el mismo patrón que FECHA_PARCIAL (el CHECK y el validador no se separan)', () => {
  const sql = readFileSync(new URL('../../../db/migrations/002_vigencia_vinculos.sql', import.meta.url), 'utf8')
  assert.ok(sql.includes(FECHA_PARCIAL.source))
})
