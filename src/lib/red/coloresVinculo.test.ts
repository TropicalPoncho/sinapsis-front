import { test } from 'node:test'
import assert from 'node:assert/strict'
import { colorDeVinculo, COLOR_VINCULO_DEFAULT } from './coloresVinculo.ts'

test('tipos con color asignado', () => {
  assert.equal(colorDeVinculo('PRODUJO'), '#FFBC00')
  assert.equal(colorDeVinculo('COLABORO_EN'), '#FF0074')
})
test('tipos estructurales caen al gris por defecto', () => {
  assert.equal(colorDeVinculo('COMPONE'), COLOR_VINCULO_DEFAULT)
  assert.equal(colorDeVinculo('PRECEDE'), COLOR_VINCULO_DEFAULT)
})
