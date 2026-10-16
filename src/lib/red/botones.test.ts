import { test } from 'node:test'
import assert from 'node:assert/strict'
import { botonesDe } from './botones.ts'
import type { NodoGrafo, NodeType } from '../../types/vista.ts'

const n = (nodeType: NodeType, o: Partial<NodoGrafo> = {}): NodoGrafo => ({
  id: 'i', nodeType, subtipo: 's', label: 'Lab', vizParams: { shape: 's', color: '#fff' }, isStub: false, ...o,
})
const EXPANDIR = { etiqueta: 'Expandir', accion: 'expandir' }
const ENTRAR = { etiqueta: 'Entrar a Lab', accion: 'entrar' }
const SUMAR = { etiqueta: 'Sumar sus obras', accion: 'sumar' }

test('OBRA/EVENTO con secciones: Expandir y Entrar, en ese orden, con o sin descripción', () => {
  for (const t of ['OBRA', 'EVENTO'] as const) {
    assert.deepEqual(botonesDe(n(t, { descripcionBreve: 'd' }), { compone: false, secciones: 3 }), [EXPANDIR, ENTRAR])
    assert.deepEqual(botonesDe(n(t), { compone: false, secciones: 2 }), [EXPANDIR, ENTRAR]) // 20 créditos y sin descripción
  }
})
test('OBRA stub con secciones: solo Entrar (un stub no expande, D-15; sí entra si tiene algo adentro)', () =>
  assert.deepEqual(botonesDe(n('OBRA', { isStub: true, descripcionBreve: 'd' }), { compone: false, secciones: 2 }), [ENTRAR]))
test('OBRA/EVENTO sin secciones y sin compone: nada, aunque tenga descripción', () => {
  assert.deepEqual(botonesDe(n('OBRA', { descripcionBreve: 'd' }), { compone: false, secciones: 0 }), [])
  assert.deepEqual(botonesDe(n('EVENTO'), { compone: false, secciones: 0 }), [])
})
test('OBRA/EVENTO que compone algo sin secciones: Entrar, no Expandir', () =>
  assert.deepEqual(botonesDe(n('EVENTO'), { compone: true, secciones: 0 }), [ENTRAR]))
test('ENTIDAD: sin compone ni secciones nada; con secciones o con compone, Entrar; nunca Expandir', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD'), { compone: false, secciones: 0 }), [])
  assert.deepEqual(botonesDe(n('ENTIDAD'), { compone: false, secciones: 2 }), [ENTRAR])
  assert.deepEqual(botonesDe(n('ENTIDAD', { isStub: true }), { compone: true, secciones: 0 }), [ENTRAR])
})
test('ENTIDAD con obras por sumar: Entrar y Sumar sus obras', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD'), { compone: false, secciones: 2, obrasPorSumar: 2 }), [ENTRAR, SUMAR])
  assert.deepEqual(botonesDe(n('ENTIDAD'), { compone: true, secciones: 0, obrasPorSumar: 0 }), [ENTRAR])
})
test('AGRUPACION: compone → Entrar; un área sin miembros no; nunca Sumar ni Expandir', () => {
  assert.deepEqual(botonesDe(n('AGRUPACION'), { compone: true, secciones: 0, obrasPorSumar: 2 }), [ENTRAR])
  assert.deepEqual(botonesDe(n('AGRUPACION'), { compone: false, secciones: 0 }), [])
})
test('nunca destino', () => assert.ok(!('destino' in botonesDe(n('ENTIDAD'), { compone: true, secciones: 0 })[0])))
