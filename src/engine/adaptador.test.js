import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptarSubgrafo } from './adaptador.js';

const tipos = new Set(['Marble', 'Lines', 'Image']);

describe('adaptarSubgrafo', () => {
    test('subgrafo vacío produce nodes y links vacíos', () => {
        assert.deepEqual(adaptarSubgrafo({ nodos: [], vinculos: [] }, tipos), { nodes: [], links: [] });
    });

    test('shape registrado se traduce a node.type', () => {
        const nodo = { id: 'a', nodeType: 'ENTIDAD', subtipo: 'persona', label: 'A', vizParams: { shape: 'Marble', color: '#fff' }, isStub: false };
        const { nodes } = adaptarSubgrafo({ nodos: [nodo], vinculos: [] }, tipos);
        assert.equal(nodes[0].type, 'Marble');
    });

    test('shape no registrado cae al default', () => {
        const nodo = { id: 'a', nodeType: 'OBRA', subtipo: 'obra', label: 'A', vizParams: { shape: 'NoExiste', color: '#fff' }, isStub: false };
        const { nodes } = adaptarSubgrafo({ nodos: [nodo], vinculos: [] }, tipos);
        assert.equal(nodes[0].type, 'Lines');
    });

    test('shape vacío o ausente cae al default', () => {
        const vacio = { id: 'a', nodeType: 'OBRA', subtipo: 'obra', label: 'A', vizParams: { shape: '', color: '#fff' }, isStub: false };
        const ausente = { id: 'b', nodeType: 'OBRA', subtipo: 'obra', label: 'B', vizParams: { color: '#fff' }, isStub: false };
        const { nodes } = adaptarSubgrafo({ nodos: [vacio, ausente], vinculos: [] }, tipos);
        assert.equal(nodes[0].type, 'Lines');
        assert.equal(nodes[1].type, 'Lines');
    });

    test('label, color y vizParams opcionales se mapean sólo si están definidos', () => {
        const conOpcionales = { id: 'a', nodeType: 'OBRA', subtipo: 'obra', label: 'Con', vizParams: { shape: 'Lines', color: '#111', speed: 2, noise: 0.5, seed: 7 }, isStub: false };
        const sinOpcionales = { id: 'b', nodeType: 'OBRA', subtipo: 'obra', label: 'Sin', vizParams: { shape: 'Lines', color: '#222' }, isStub: false };
        const { nodes } = adaptarSubgrafo({ nodos: [conOpcionales, sinOpcionales], vinculos: [] }, tipos);

        assert.equal(nodes[0].name, 'Con');
        assert.equal(nodes[0].color, '#111');
        assert.equal(nodes[0].speed, 2);
        assert.equal(nodes[0].noise, 0.5);
        assert.equal(nodes[0].seed, 7);

        assert.equal(nodes[1].name, 'Sin');
        assert.equal(nodes[1].color, '#222');
        assert.equal('speed' in nodes[1], false);
        assert.equal('noise' in nodes[1], false);
        assert.equal('seed' in nodes[1], false);
    });

    test('thumb se resuelve a ruta pública; sin thumb, sin img', () => {
        const conThumb = { id: 'a', nodeType: 'OBRA', subtipo: 'obra', label: 'A', thumb: 'obras/nudo.png', vizParams: { shape: 'Image', color: '#fff' }, isStub: false };
        const sinThumb = { id: 'b', nodeType: 'OBRA', subtipo: 'obra', label: 'B', vizParams: { shape: 'Lines', color: '#fff' }, isStub: false };
        const { nodes } = adaptarSubgrafo({ nodos: [conThumb, sinThumb], vinculos: [] }, tipos);

        assert.equal(nodes[0].img, '/obras/nudo.png');
        assert.equal('img' in nodes[1], false);
    });

    test('esImagen sólo es true para shape Image', () => {
        const imagen = { id: 'a', nodeType: 'OBRA', subtipo: 'obra', label: 'A', vizParams: { shape: 'Image', color: '#fff' }, isStub: false };
        const otro = { id: 'b', nodeType: 'OBRA', subtipo: 'obra', label: 'B', vizParams: { shape: 'Marble', color: '#fff' }, isStub: false };
        const { nodes } = adaptarSubgrafo({ nodos: [imagen, otro], vinculos: [] }, tipos);

        assert.equal(nodes[0].esImagen, true);
        assert.equal(nodes[1].esImagen, false);
    });

    test('id, nodeType y subtipo viajan tal cual', () => {
        const nodo = { id: 'x1', nodeType: 'AGRUPACION', subtipo: 'serie', label: 'X', vizParams: { shape: 'Lines', color: '#fff' }, isStub: false };
        const { nodes } = adaptarSubgrafo({ nodos: [nodo], vinculos: [] }, tipos);
        assert.equal(nodes[0].id, 'x1');
        assert.equal(nodes[0].nodeType, 'AGRUPACION');
        assert.equal(nodes[0].subtipo, 'serie');
    });

    test('un vínculo se traduce a source/target conservando tipoVinculo y rol', () => {
        const vinculo = { id: 'v1', origen: 'a', destino: 'b', tipoVinculo: 'PRODUJO', rol: 'anfitrion' };
        const { links } = adaptarSubgrafo({ nodos: [], vinculos: [vinculo] }, tipos);
        assert.deepEqual(links[0], { id: 'v1', source: 'a', target: 'b', tipoVinculo: 'PRODUJO', rol: 'anfitrion' });
    });

    test('no muta el Subgrafo de entrada', () => {
        const nodo = { id: 'a', nodeType: 'OBRA', subtipo: 'obra', label: 'A', vizParams: { shape: 'Marble', color: '#fff' }, isStub: false };
        const subgrafo = { nodos: [nodo], vinculos: [] };
        adaptarSubgrafo(subgrafo, tipos);
        adaptarSubgrafo(subgrafo, tipos);
        assert.equal('type' in nodo, false);
    });
});
