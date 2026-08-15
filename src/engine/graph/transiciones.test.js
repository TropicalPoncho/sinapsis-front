import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { clasificarCambio, pinear, soltarPin, fusionar } from './transiciones.js'

// `desvanecerYQuitar` depende de requestAnimationFrame (DOM) y no se testea acá headless.

describe('clasificarCambio', () => {
    const a = { id: 'a', x: 1, y: 1, z: 1 }
    const b = { id: 'b', x: 2, y: 2, z: 2 }
    const c = { id: 'c', x: 3, y: 3, z: 3 }
    const d = { id: 'd' } // recién adaptado, sin x/y/z

    test('actuales [a,b,c], nuevos [b,c,d]', () => {
        const { quedan, salen, entran } = clasificarCambio([a, b, c], [{ id: 'b' }, { id: 'c' }, d])
        assert.deepEqual(quedan.map(n => n.id), ['b', 'c'])
        assert.deepEqual(salen.map(n => n.id), ['a'])
        assert.deepEqual(entran.map(n => n.id), ['d'])
        // quedan devuelve los objetos de actuales (con x/y/z), no los de nuevos
        assert.equal(quedan[0], b)
    })

    test('nuevos vacío: todo sale', () => {
        const { quedan, salen, entran } = clasificarCambio([a, b, c], [])
        assert.deepEqual(quedan, [])
        assert.deepEqual(salen.map(n => n.id), ['a', 'b', 'c'])
        assert.deepEqual(entran, [])
    })

    test('actuales vacío: todo entra', () => {
        const { quedan, salen, entran } = clasificarCambio([], [{ id: 'a' }, { id: 'b' }])
        assert.deepEqual(quedan, [])
        assert.deepEqual(salen, [])
        assert.deepEqual(entran.map(n => n.id), ['a', 'b'])
    })
})

describe('pinear', () => {
    test('fija fx/fy/fz desde x/y/z', () => {
        const nodo = { id: 'a', x: 1, y: 2, z: 3 }
        pinear([nodo])
        assert.equal(nodo.fx, 1)
        assert.equal(nodo.fy, 2)
        assert.equal(nodo.fz, 3)
    })

    test('no pinea un nodo sin x definido', () => {
        const nodo = { id: 'a' }
        pinear([nodo])
        assert.equal('fx' in nodo, false)
    })

    test('es idempotente', () => {
        const nodo = { id: 'a', x: 1, y: 2, z: 3 }
        pinear([nodo])
        pinear([nodo])
        assert.equal(nodo.fx, 1)
        assert.equal(nodo.fy, 2)
        assert.equal(nodo.fz, 3)
    })
})

describe('soltarPin', () => {
    test('quita fx/fy/fz', () => {
        const nodo = { id: 'a', x: 1, y: 2, z: 3, fx: 1, fy: 2, fz: 3 }
        soltarPin([nodo])
        assert.equal('fx' in nodo, false)
        assert.equal('fy' in nodo, false)
        assert.equal('fz' in nodo, false)
    })
})

describe('fusionar', () => {
    test('concatena quedan (misma identidad) con entran', () => {
        const quedan = [{ id: 'b' }, { id: 'c' }]
        const entran = [{ id: 'd' }]
        const res = fusionar(quedan, entran)
        assert.deepEqual(res.map(n => n.id), ['b', 'c', 'd'])
        assert.equal(res[0], quedan[0])
    })
})
