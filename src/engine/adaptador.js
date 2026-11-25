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

// D-53: cómo se dibuja el nodo que trae una config de crecimiento (`nodo.crecimiento`, validada en la API) en ESTA escena. Función pura de
// (Subgrafo, raíz de la red): la señal viene de los datos, no de ids ni nombres.
//   'completo'  la red es la del propio nodo y están sus dos fundadoras: el crecimiento ES la neurona (no hay esfera) y las raíces se
//               dibujan chicas y se anclan al núcleo.
//   'mini'      cualquier otra red que contenga el nodo: se ve como una versión pequeña del crecimiento, esférica e irregular.
// Devuelve null si ningún nodo de la escena trae config. `ajustes` (escalaRaices, radioEncuadre) los pone el motor, que conoce el mundo.
export function contextoCrecimiento(subgrafo, raizId, ajustes = {}) {
    // ponytail: tope = 1 nodo que crece por escena (el primero con config) y un LineSegments por nodo (~0.4k segmentos la mini, 1 draw call).
    // Si aparecen decenas de eventos que crecen: un Set de ids + geometría compartida o instancing, y el tope pasa a constante.
    const nodo = subgrafo.nodos.find((n) => n.crecimiento);
    if (!nodo) return null;
    const porId = new Map(subgrafo.nodos.map((n) => [n.id, n]));
    const ids = nodo.crecimiento.raices.map((r) => r.id);
    const completo = raizId === nodo.id && ids.slice(0, 2).every((id) => porId.has(id));
    return {
        nodoId: nodo.id,
        config: nodo.crecimiento,
        modo: completo ? 'completo' : 'mini',
        raices: new Set(completo ? ids.filter((id) => porId.has(id)) : []),
        coloresRaices: ids.slice(0, 2).map((id) => porId.get(id)?.vizParams?.color ?? nodo.vizParams?.color),
        ...ajustes,
    };
}

// Forma de las raíces cuando su estructura está activa: de la misma familia orgánica que el resto de la red. Un sprite de imagen (el logo
// de Tropical) no es una neurona orgánica; se reemplaza por una forma del conjunto cerrado de renderers del motor.
const ORGANICA = 'Perlin';

export function adaptarSubgrafo(subgrafo, tiposValidos = ThreeObjectManager.getTypes(), crec = null) {
    const nodes = subgrafo.nodos.map((nodo) => {
        const shape = nodo.vizParams?.shape;
        let type = tieneShape(tiposValidos, shape) ? shape : ThreeObjectManager.defaultType;
        const esCrecimiento = crec?.nodoId === nodo.id && tieneShape(tiposValidos, 'Crecimiento');
        const esRaiz = !esCrecimiento && crec?.raices.has(nodo.id);
        if (esCrecimiento) type = 'Crecimiento';
        else if (esRaiz && type === 'Image' && tieneShape(tiposValidos, ORGANICA)) type = ORGANICA;

        const node = {
            id: nodo.id,
            nodeType: nodo.nodeType,
            subtipo: nodo.subtipo,
            name: nodo.label,
            color: nodo.vizParams?.color,
            type,
            // Booleano derivado del dato curado (shape === 'Image'), no de nodeType:
            // un nodo Image entra entero a escena, un shader se derrama por el borde.
            esImagen: type === 'Image',
        };
        if (esCrecimiento) {
            node.crecimiento = crec.config;
            node.crecimientoModo = crec.modo;
            node.coloresRaices = crec.coloresRaices;
            if (crec.modo === 'completo') node.radioEncuadre = crec.radioEncuadre;
        }
        if (esRaiz) node.escalaCrecimiento = crec.escalaRaices;
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
