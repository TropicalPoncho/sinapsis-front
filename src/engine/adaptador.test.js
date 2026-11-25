import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptarSubgrafo, contextoCrecimiento } from './adaptador.js';

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
        const a = { id: 'a', nodeType: 'OBRA', subtipo: 'obra', label: 'A', vizParams: { shape: 'Lines', color: '#fff' }, isStub: false };
        const b = { id: 'b', nodeType: 'OBRA', subtipo: 'obra', label: 'B', vizParams: { shape: 'Lines', color: '#fff' }, isStub: false };
        const vinculo = { id: 'v1', origen: 'a', destino: 'b', tipoVinculo: 'PRODUJO', rol: 'anfitrion' };
        const { links } = adaptarSubgrafo({ nodos: [a, b], vinculos: [vinculo] }, tipos);
        assert.deepEqual(links[0], { id: 'v1', source: 'a', target: 'b', tipoVinculo: 'PRODUJO', rol: 'anfitrion' });
    });

    test('un vínculo hacia un id que no está en nodos se descarta (evita el "node not found" de d3-force)', () => {
        const a = { id: 'a', nodeType: 'OBRA', subtipo: 'obra', label: 'A', vizParams: { shape: 'Lines', color: '#fff' }, isStub: false };
        const vinculo = { id: 'v1', origen: 'a', destino: 'raiz-ausente', tipoVinculo: 'COMPONE' };
        const { links } = adaptarSubgrafo({ nodos: [a], vinculos: [vinculo] }, tipos);
        assert.deepEqual(links, []);
    });

    test('no muta el Subgrafo de entrada', () => {
        const nodo = { id: 'a', nodeType: 'OBRA', subtipo: 'obra', label: 'A', vizParams: { shape: 'Marble', color: '#fff' }, isStub: false };
        const subgrafo = { nodos: [nodo], vinculos: [] };
        adaptarSubgrafo(subgrafo, tipos);
        adaptarSubgrafo(subgrafo, tipos);
        assert.equal('type' in nodo, false);
    });
});

// D-53: cómo se dibuja el nodo con config de crecimiento. La señal sale de los datos (nodo.crecimiento), no de ids ni nombres.
describe('crecimiento (D-53)', () => {
    const tiposC = new Set(['Marble', 'Lines', 'Image', 'Perlin', 'Crecimiento']);
    const cfg = { semilla: 1, algoritmo: 'dendrita-v2', inicio: '2026-11-25T00:00:00-03:00', fin: '2026-12-05T00:00:00-03:00', n: 100, raices: [{ id: 'r1' }, { id: 'r2' }] };
    const mk = (id, extra = {}, viz = {}) => ({ id, nodeType: 'ENTIDAD', subtipo: 'x', label: id, vizParams: { shape: 'Marble', color: '#abc', ...viz }, isStub: false, ...extra });
    const evento = mk('ev', { nodeType: 'EVENTO', crecimiento: cfg }, { color: '#111' });
    const r1 = mk('r1', {}, { shape: 'Image', color: '#f00' }), r2 = mk('r2', {}, { color: '#0f0' });

    test('en la red del propio nodo: el evento es la estructura completa y las dos raíces van chicas y orgánicas', () => {
        const sub = { nodos: [evento, r1, r2, mk('otro')], vinculos: [] };
        const ctx = contextoCrecimiento(sub, 'ev', { escalaRaices: 0.5, radioEncuadre: 120 });
        assert.equal(ctx.modo, 'completo');
        assert.deepEqual(ctx.coloresRaices, ['#f00', '#0f0']);
        const { nodes } = adaptarSubgrafo(sub, tiposC, ctx);
        const por = Object.fromEntries(nodes.map((n) => [n.id, n]));
        assert.equal(por.ev.type, 'Crecimiento');
        assert.equal(por.ev.crecimientoModo, 'completo');
        assert.equal(por.ev.radioEncuadre, 120);
        assert.equal(por.r1.type, 'Perlin'); // una imagen no es una neurona orgánica: se cambia por una forma del conjunto cerrado de renderers
        assert.equal(por.r1.esImagen, false);
        assert.equal(por.r1.escalaCrecimiento, 0.5);
        assert.equal(por.r2.type, 'Marble'); // una forma orgánica queda como está, solo más chica
        assert.equal(por.r2.escalaCrecimiento, 0.5);
        assert.equal(por.otro.escalaCrecimiento, undefined);
        assert.equal(por.otro.type, 'Marble');
    });

    test('en cualquier otra red que lo contenga: versión mini del nodo y las demás formas intactas', () => {
        const sub = { nodos: [evento, r1], vinculos: [] };
        const ctx = contextoCrecimiento(sub, 'otra-red');
        assert.equal(ctx.modo, 'mini');
        const { nodes } = adaptarSubgrafo(sub, tiposC, ctx);
        assert.equal(nodes[0].type, 'Crecimiento');
        assert.equal(nodes[0].crecimientoModo, 'mini');
        assert.equal(nodes[0].radioEncuadre, undefined);
        assert.equal(nodes[1].type, 'Image'); // fuera de su red las raíces no cambian
        assert.equal(nodes[1].escalaCrecimiento, undefined);
    });

    test('sin config en la escena no hay contexto, y sin el renderer registrado el nodo cae a su forma de siempre', () => {
        assert.equal(contextoCrecimiento({ nodos: [r1, r2], vinculos: [] }, 'r1'), null);
        const sub = { nodos: [evento], vinculos: [] };
        const { nodes } = adaptarSubgrafo(sub, tipos, contextoCrecimiento(sub, 'ev'));
        assert.equal(nodes[0].type, 'Marble');
    });

    test('red propia pero sin las dos fundadoras en escena: queda en mini (no hay a quién anclar)', () => {
        assert.equal(contextoCrecimiento({ nodos: [evento, r1], vinculos: [] }, 'ev').modo, 'mini');
    });
});
