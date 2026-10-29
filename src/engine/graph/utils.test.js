import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fuerzaGravedad } from './utils.js'

test('fuerzaGravedad tira al origen, proporcional a la posición y a alpha', () => {
    const n = { x: 100, y: -50, z: 10, vx: 0, vy: 0, vz: 0 }
    const f = fuerzaGravedad(0.1)
    f.initialize([n])
    f(0.5)
    assert.deepEqual([n.vx, n.vy, n.vz], [-5, 2.5, -0.5])
})

test('fuerzaGravedad: k=0 no mueve nada y sin vz (2D) no inventa uno', () => {
    const quieto = { x: 9, y: 9, z: 9, vx: 0, vy: 0, vz: 0 }
    const f0 = fuerzaGravedad(0)
    f0.initialize([quieto])
    f0(1)
    assert.deepEqual([quieto.vx, quieto.vy, quieto.vz], [0, 0, 0])
    const plano = { x: 10, y: 10, vx: 0, vy: 0 }
    const f = fuerzaGravedad(0.1)
    f.initialize([plano])
    f(1)
    assert.equal(plano.vz, undefined)
    assert.deepEqual([plano.vx, plano.vy], [-1, -1])
})
