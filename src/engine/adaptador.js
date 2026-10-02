// Traduce el contrato `Subgrafo` (src/types/vista.ts) a lo que consume `3d-force-graph`
// y el registry de `ThreeObjectManager`. El único mapeo con significado es
// `vizParams.shape` -> `node.type`, con fallback al tipo por defecto si el shape
// no está registrado (dato curado corrupto o `ThreeObject` nuevo sin registrar).
//
// ponytail: el mapeo es una función de 20 líneas y no una capa de adaptadores por tipo;
// si un `ThreeObject` nuevo necesitara un campo propio, entra acá una línea más.
import { ThreeObjectManager } from './threeObjects/ThreeObjectManager.js';

function tieneShape(tiposValidos, shape) {
    if (!shape) return false;
    if (tiposValidos instanceof Set) return tiposValidos.has(shape);
    return Object.hasOwn(tiposValidos ?? {}, shape);
}

export function adaptarSubgrafo(subgrafo, tiposValidos = ThreeObjectManager.getTypes()) {
    const nodes = subgrafo.nodos.map((nodo) => {
        const shape = nodo.vizParams?.shape;
        const type = tieneShape(tiposValidos, shape) ? shape : ThreeObjectManager.defaultType;

        const node = {
            id: nodo.id,
            nodeType: nodo.nodeType,
            subtipo: nodo.subtipo,
            name: nodo.label,
            color: nodo.vizParams?.color,
            type,
            // Booleano derivado del dato curado (shape === 'Image'), no de nodeType:
            // un nodo Image entra entero a escena, un shader se derrama por el borde.
            esImagen: shape === 'Image',
        };
        if (nodo.vizParams?.speed !== undefined) node.speed = nodo.vizParams.speed;
        if (nodo.vizParams?.noise !== undefined) node.noise = nodo.vizParams.noise;
        if (nodo.vizParams?.seed !== undefined) node.seed = nodo.vizParams.seed;
        if (nodo.thumb) node.img = `/${nodo.thumb}`;

        return node;
    });

    // resolverVista puede devolver un vínculo hacia la raíz aunque incluirRaiz la haya sacado de
    // `nodos` (contrato deliberado, ver resolverVista.test.ts "conserva las aristas que la
    // conectan" — sirve para el modo aditivo, donde esa raíz ya está en escena). Acá, en cambio,
    // `nodes` es TODO lo que va a existir en el grafo de 3d-force-graph: un link a un id ausente
    // hace que d3-force-3d tire "node not found" apenas arranca la simulación (bug real: entrar a
    // un AGRUPACION con incluirRaiz:false que tenía un vínculo propio hacia un hijo).
    const idsDeNodos = new Set(nodes.map((n) => n.id));
    const links = subgrafo.vinculos
        .filter((vinculo) => idsDeNodos.has(vinculo.origen) && idsDeNodos.has(vinculo.destino))
        .map((vinculo) => {
            const link = {
                id: vinculo.id,
                source: vinculo.origen,
                target: vinculo.destino,
                tipoVinculo: vinculo.tipoVinculo,
            };
            if (vinculo.rol !== undefined) link.rol = vinculo.rol;
            if (vinculo.distance !== undefined) link.distance = vinculo.distance;
            if (vinculo.virtual !== undefined) link.virtual = vinculo.virtual;
            return link;
        });

    return { nodes, links };
}
