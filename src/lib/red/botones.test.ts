import { test } from 'node:test'
import assert from 'node:assert/strict'
import { botonesDe } from './botones.ts'
import type { NodoGrafo, NodeType } from '../../types/vista.ts'

const n = (nodeType: NodeType, o: Partial<NodoGrafo> = {}): NodoGrafo => ({
  id: 'i', nodeType, subtipo: 's', label: 'Lab', vizParams: { shape: 's', color: '#fff' }, isStub: false, ...o,
})
const EXPANDIR = [{ etiqueta: 'Expandir', accion: 'expandir' }]

test('OBRA/EVENTO con secciones: Expandir, con o sin descripción', () => {
  for (const t of ['OBRA', 'EVENTO'] as const) {
    assert.deepEqual(botonesDe(n(t, { descripcionBreve: 'd' }), { grado: 0, secciones: 2 }), EXPANDIR)
    assert.deepEqual(botonesDe(n(t), { grado: 0, secciones: 2 }), EXPANDIR) // Tempistica II: 20 créditos y sin descripción
  }
})
test('OBRA stub con secciones: sin botones', () => assert.deepEqual(botonesDe(n('OBRA', { isStub: true, descripcionBreve: 'd' }), { grado: 3, secciones: 2 }), []))
test('OBRA/EVENTO sin secciones: sin botones, aunque tenga descripción', () => {
  assert.deepEqual(botonesDe(n('OBRA', { descripcionBreve: 'd' }), { grado: 3, secciones: 0 }), [])
  assert.deepEqual(botonesDe(n('EVENTO'), { grado: 3, secciones: 0 }), [])
})
test('ENTIDAD/AGRUPACION con grado: Entrar, incluso stub; nunca Expandir aunque tengan secciones', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD', { isStub: true }), { grado: 2, secciones: 3 }), [{ etiqueta: 'Entrar a Lab', accion: 'entrar' }])
  assert.deepEqual(botonesDe(n('AGRUPACION'), { grado: 1, secciones: 3 }), [{ etiqueta: 'Entrar a Lab', accion: 'entrar' }])
})
test('grado 0: sin botones', () => assert.deepEqual(botonesDe(n('ENTIDAD'), { grado: 0, secciones: 3 }), []))
test('ENTIDAD con obras por sumar: Entrar y Sumar sus obras', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD'), { grado: 3, secciones: 3, obrasPorSumar: 2 }), [
    { etiqueta: 'Entrar a Lab', accion: 'entrar' }, { etiqueta: 'Sumar sus obras', accion: 'sumar' }])
})
test('sin obras por sumar (0 o ausente) solo Entrar; AGRUPACION/OBRA/EVENTO no cambian', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD'), { grado: 3, secciones: 0, obrasPorSumar: 0 }), [{ etiqueta: 'Entrar a Lab', accion: 'entrar' }])
  assert.deepEqual(botonesDe(n('AGRUPACION'), { grado: 3, secciones: 0, obrasPorSumar: 2 }), [{ etiqueta: 'Entrar a Lab', accion: 'entrar' }])
  assert.deepEqual(botonesDe(n('OBRA', { descripcionBreve: 'd' }), { grado: 3, secciones: 1, obrasPorSumar: 2 }), EXPANDIR)
})
test('nunca destino', () => assert.ok(!('destino' in botonesDe(n('ENTIDAD'), { grado: 1, secciones: 0 })[0])))
