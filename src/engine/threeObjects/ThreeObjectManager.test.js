import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ThreeObjectManager } from './ThreeObjectManager.js';
import { ThreeObject } from './ThreeObject.js';

function meshFalso(llamadas, { geometry } = {}) {
    return {
        geometry: geometry ?? { dispose: () => llamadas.push('geo') },
        material: { dispose: () => llamadas.push('material') },
        children: [],
    };
}

describe('ThreeObjectManager.disposeUnusedObjects', () => {
    beforeEach(() => {
        ThreeObject.geometryCache.clear();
    });

    test('deja sólo las instancias a mantener', () => {
        const manager = new ThreeObjectManager({});
        const llamadas = [];
        manager._objectInstances.a = { mesh: meshFalso(llamadas) };
        manager._objectInstances.b = { mesh: meshFalso(llamadas) };

        manager.disposeUnusedObjects(['a']);

        assert.deepEqual(Object.keys(manager._objectInstances), ['a']);
    });

    test('dispone la geometría de un nodo que sale si no está en el geometryCache', () => {
        const manager = new ThreeObjectManager({});
        const llamadas = [];
        manager._objectInstances.a = { mesh: meshFalso(llamadas) };
        manager._objectInstances.b = { mesh: meshFalso(llamadas) };

        manager.disposeUnusedObjects(['a']);

        assert.deepEqual(llamadas, ['geo', 'material']);
    });

    test('no dispone la geometría compartida en el geometryCache', () => {
        const manager = new ThreeObjectManager({});
        const llamadas = [];
        const geoCompartida = { dispose: () => llamadas.push('geo-compartida') };
        ThreeObject.geometryCache.set('k', geoCompartida);

        manager._objectInstances.a = { mesh: meshFalso(llamadas, { geometry: geoCompartida }) };
        manager._objectInstances.b = { mesh: meshFalso(llamadas, { geometry: geoCompartida }) };

        manager.disposeUnusedObjects(['a']);

        assert.equal(llamadas.includes('geo-compartida'), false);
        assert.equal(llamadas.includes('material'), true);
    });

    test('disposeUnusedObjects([]) vacía todo sin disponer geometrías compartidas', () => {
        const manager = new ThreeObjectManager({});
        const llamadas = [];
        const geoCompartida = { dispose: () => llamadas.push('geo-compartida') };
        ThreeObject.geometryCache.set('k', geoCompartida);
        manager._objectInstances.a = { mesh: meshFalso(llamadas, { geometry: geoCompartida }) };

        manager.disposeUnusedObjects([]);

        assert.deepEqual(manager._objectInstances, {});
        assert.equal(llamadas.includes('geo-compartida'), false);
    });

    test('un mesh con hijos dispone los materiales de los hijos', () => {
        const manager = new ThreeObjectManager({});
        const llamadas = [];
        const hijo = meshFalso(llamadas);
        const padre = meshFalso(llamadas);
        padre.children = [hijo];
        manager._objectInstances.a = { mesh: padre };

        manager.disposeUnusedObjects([]);

        assert.equal(llamadas.filter((l) => l === 'material').length, 2);
        assert.equal(llamadas.filter((l) => l === 'geo').length, 2);
    });
});
