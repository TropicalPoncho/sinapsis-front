// Las tres transiciones comparten un problema: `graphData()` re-calienta la simulación de
// fuerzas (three-forcegraph:1385, `.stop().alpha(1)`, incondicional). Fijar fx/fy/fz es el
// único mecanismo que sobrevive a ese reheat — d3-force-3d reescribe x = fx en cada tick.

/**
 * Compara nodosActuales (los que ya están en `graph.graphData().nodes`, con x/y/z simulados)
 * contra nodosNuevos (recién adaptados, sin x/y/z) por `id`.
 * @returns {{ quedan: Array, salen: Array, entran: Array }} `quedan` son los objetos de
 *   nodosActuales (conservan posición), no los de nodosNuevos.
 */
export function clasificarCambio(nodosActuales, nodosNuevos) {
    const idsNuevos = new Set(nodosNuevos.map(n => n.id));
    const idsActuales = new Set(nodosActuales.map(n => n.id));
    const quedan = nodosActuales.filter(n => idsNuevos.has(n.id));
    const salen = nodosActuales.filter(n => !idsNuevos.has(n.id));
    const entran = nodosNuevos.filter(n => !idsActuales.has(n.id));
    return { quedan, salen, entran };
}

/** Fija fx/fy/fz desde x/y/z para que sobrevivan al reheat. No pinea nodos sin simular. */
export function pinear(nodos) {
    for (const n of nodos) {
        if (n.x != null) {
            n.fx = n.x;
            n.fy = n.y;
            n.fz = n.z;
        }
    }
}

/** Inversa de `pinear`: vuelve a dejar los nodos libres para la simulación de fuerzas. */
export function soltarPin(nodos) {
    for (const n of nodos) {
        delete n.fx;
        delete n.fy;
        delete n.fz;
    }
}

/** Concatena `quedan` (misma identidad de referencia) con `entran`. */
export function fusionar(quedan, entran) {
    return [...quedan, ...entran];
}

/**
 * Desvanece los meshes de `ids` (escala de 1 a 0) y los libera vía `threeObjectManager`.
 * ponytail: la mayoría de los ThreeObject usan ShaderMaterial propio y no respetan
 * `material.opacity`; escalar el Group a 0 funciona para los 15 sin tocar ninguno. Si hace
 * falta un fundido real por opacidad, entra un uniform `uOpacity` en la clase base y acá se
 * anima ese en vez de la escala.
 * @returns {Promise<void>}
 */
export function desvanecerYQuitar(threeObjectManager, ids, duracion) {
    const meshes = ids
        .map(id => threeObjectManager._objectInstances[id]?.mesh)
        .filter(Boolean);

    if (meshes.length === 0) return Promise.resolve();

    return new Promise(resolve => {
        let start = null;
        const step = now => {
            if (!start) start = now;
            const t = Math.min((now - start) / Math.max(duracion, 1), 1);
            const escala = 1 - t;
            for (const mesh of meshes) mesh.scale.setScalar(escala);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                // Sólo desvanece: liberar acá dejaba objetos ya liberados en la escena hasta que la
                // librería procesa graphData(), y el render los volvía a subir a la GPU. El
                // motor libera después de ese procesamiento (SinapsisEngine._liberarTrasDigest).
                resolve();
            }
        };
        requestAnimationFrame(step);
    });
}

/**
 * Los nodos que entran no traen x/y/z: d3 los inicializa en el origen y viajan desde ahí. Si
 * tienen un vínculo con un nodo ya presente, nacen junto a él (a `radio` de distancia, repartidos
 * por ángulo áureo para que dos hermanos no coincidan). d3-force-3d no reinicializa un nodo que ya
 * trae x. Muta `entran`.
 * ponytail: sin vecino presente cae al origen como antes; solo mira el primer vecino presente.
 * @param {Array} entran nodos recién adaptados
 * @param {Array} links `source`/`target` como id o como objeto con `.id`
 * @param {Map} presentesPorId id -> nodo con x/y/z simulados
 * @param {number} radio distancia de siembra (menor a la de link base)
 */
export function sembrarJuntoAVecinos(entran, links, presentesPorId, radio) {
    const idDe = e => (e !== null && typeof e === 'object' ? e.id : e);
    entran.forEach((n, i) => {
        if (n.x != null) return;
        for (const l of links) {
            const s = idDe(l.source), t = idDe(l.target);
            const otro = s === n.id ? t : t === n.id ? s : undefined;
            const v = otro !== undefined ? presentesPorId.get(otro) : undefined;
            if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) continue;
            const a = (i + 1) * 2.399963;
            n.x = v.x + radio * Math.cos(a);
            n.y = v.y + radio * Math.sin(a);
            n.z = v.z;
            return;
        }
    });
}
