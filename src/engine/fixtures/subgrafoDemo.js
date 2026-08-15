// Subgrafo de desarrollo para el motor 3D sin depender del endpoint de la Fase 2.
// Labels y thumbs tomados de data/curaduria/nodos.csv y public/{obras,entidades}/.
// ponytail: literal a mano, no generado — son 12 nodos, no hace falta un builder.

const color = '#8AE2C8';

const nodos = [
    // 3 OBRA con shape Image y thumb real bajo public/obras/
    { id: 'nudo', nodeType: 'OBRA', subtipo: 'obra', label: 'NUDO', thumb: 'obras/nudo.png', vizParams: { shape: 'Image', color }, isStub: false },
    { id: 'espora', nodeType: 'OBRA', subtipo: 'obra', label: 'ESPORA', descripcionBreve: 'Encuentro para la promoción de la producción colectiva', thumb: 'obras/espora.png', vizParams: { shape: 'Image', color }, isStub: false },
    { id: 'wip', nodeType: 'OBRA', subtipo: 'obra', label: 'WIP', thumb: 'obras/wip.png', vizParams: { shape: 'Image', color }, isStub: false },

    // ENTIDAD con formas variadas
    { id: 'tropical-poncho', nodeType: 'ENTIDAD', subtipo: 'productora', label: 'Tropical Poncho', descripcionBreve: 'Productora de Experiencias Artísticas', thumb: 'entidades/tropical-poncho.png', vizParams: { shape: 'Marble', color: '#578CCB' }, isStub: false },
    { id: 'kutral', nodeType: 'ENTIDAD', subtipo: 'proyecto', label: 'Kutral', descripcionBreve: 'El Fuego: Primer festival/experiencia en la Comarca Andina', vizParams: { shape: 'Fire', color: '#FF0074' }, isStub: false },
    { id: 'tempistica', nodeType: 'ENTIDAD', subtipo: 'proyecto', label: 'Tempistica', descripcionBreve: 'La sincronicidad', vizParams: { shape: 'Twist', color: '#FFBC00' }, isStub: false },

    // OBRA y AGRUPACION
    { id: 'soma', nodeType: 'OBRA', subtipo: 'obra', label: 'SOMA', vizParams: { shape: 'Lights', color: '#9900FF' }, isStub: false },
    { id: 'serie-uno', nodeType: 'AGRUPACION', subtipo: 'serie', label: 'Serie Uno', vizParams: { shape: 'Lines', color }, isStub: false },

    // Nodo aislado — sin vínculos, cubre el caso degenerado de elegirLadoOrbit
    { id: 'aislado', nodeType: 'ENTIDAD', subtipo: 'persona', label: 'Rama Cerratto', descripcionBreve: 'Gestorx Cultural, Curadorx, DJ', vizParams: { shape: 'Perlin', color }, isStub: false },

    // Sub-cluster de 2, vinculados sólo entre sí
    { id: 'cluster-a', nodeType: 'ENTIDAD', subtipo: 'persona', label: 'Ana Hagen', vizParams: { shape: 'Noise', color }, isStub: false },
    { id: 'cluster-b', nodeType: 'ENTIDAD', subtipo: 'persona', label: 'Mechi Botta', vizParams: { shape: 'Particles', color }, isStub: false },

    // Shape no registrado — prueba el fallback en vivo
    { id: 'shape-invalido', nodeType: 'OBRA', subtipo: 'obra', label: 'Nodo con shape roto', vizParams: { shape: 'NoExiste', color }, isStub: false },
];

const vinculos = [
    { id: 'v1', origen: 'tropical-poncho', destino: 'nudo', tipoVinculo: 'PRODUJO' },
    { id: 'v2', origen: 'tropical-poncho', destino: 'espora', tipoVinculo: 'PRODUJO' },
    { id: 'v3', origen: 'tropical-poncho', destino: 'wip', tipoVinculo: 'PRODUJO' },
    { id: 'v4', origen: 'tropical-poncho', destino: 'kutral', tipoVinculo: 'PRODUJO' },
    { id: 'v5', origen: 'tropical-poncho', destino: 'tempistica', tipoVinculo: 'PRODUJO' },
    { id: 'v6', origen: 'tropical-poncho', destino: 'soma', tipoVinculo: 'PRODUJO' },
    { id: 'v7', origen: 'serie-uno', destino: 'nudo', tipoVinculo: 'COMPONE' },
    { id: 'v8', origen: 'serie-uno', destino: 'espora', tipoVinculo: 'COMPONE' },
    { id: 'v9', origen: 'cluster-a', destino: 'cluster-b', tipoVinculo: 'COLABORO_EN', rol: 'dj' },
];

export const subgrafoDemo = { nodos, vinculos };

// Recorte a Tropical Poncho y sus vecinos directos — para ejercitar `filtrado`/`aditivo`
// en el Plan 04 sin inventar data ahí.
const idsFiltrado = new Set(['tropical-poncho', 'nudo', 'espora', 'wip', 'kutral', 'tempistica', 'soma']);
export const subgrafoDemoFiltrado = {
    nodos: nodos.filter((n) => idsFiltrado.has(n.id)),
    vinculos: vinculos.filter((v) => idsFiltrado.has(v.origen) && idsFiltrado.has(v.destino)),
};
