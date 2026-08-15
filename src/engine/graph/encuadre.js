// Geometría pura de encuadre (MOTR-08, MOTR-10, MOTR-11): offset de frustum contra el área
// segura, distancia para que un nodo Image entre entero, y elección del ángulo de órbita.
// Sin imports a propósito: no conoce three ni la cámara, se testea headless con node --test.
// La aplica el controlador de cámara del motor, que sí conoce la proyección y sus métodos.

export function centroAreaSegura(areaSegura, viewportW, viewportH) {
    return {
        x: (areaSegura.left + (viewportW - areaSegura.right)) / 2,
        y: (areaSegura.top + (viewportH - areaSegura.bottom)) / 2,
    };
}

// Offset para pasar al método de traslación de frustum de la cámara: (W, H, offset.x, offset.y, W, H).
// fullWidth === width ⇒ traslación pura del frustum, sin escalar: nada de zoom implícito.
// Derivación (PerspectiveCamera.updateProjectionMatrix): left' = left + offsetX,
// top' = top - offsetY ⇒ el punto que caía en W/2 cae en W/2 - offsetX. Igualando a
// rectCenterX: offsetX = W/2 - rectCenterX.
export function offsetDeAreaSegura(areaSegura, viewportW, viewportH) {
    const c = centroAreaSegura(areaSegura, viewportW, viewportH);
    return { x: viewportW / 2 - c.x, y: viewportH / 2 - c.y };
}

/**
 * Distancia de cámara para que una esfera de radio `radio` entre completa en un rect de
 * rectW x rectH (en píxeles), dado el FOV vertical de la cámara (grados) y el alto real del
 * canvas. Derivado directamente de PerspectiveCamera.updateProjectionMatrix():
 *   top = near·tan(fov/2); la proyección vertical en píxeles de un objeto de 2r a distancia d
 *   es 2r·canvasHeight / (2d·tan(fov/2)).
 * Se toma el lado más restrictivo (min(rectW, rectH)) porque el objeto debe entrar en AMBOS ejes.
 * `margen` deja aire para no tocar el borde exacto del área segura.
 */
export function distanciaParaEncuadrar(radio, rectW, rectH, canvasHeight, fovGrados, margen = 0.9) {
    const fovRad = fovGrados * Math.PI / 180;
    const ladoLimitante = Math.min(rectW, rectH) * margen;
    return radio * canvasHeight / (Math.tan(fovRad / 2) * ladoLimitante);
}

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y*b.z - a.z*b.y, y: a.z*b.x - a.x*b.z, z: a.x*b.y - a.y*b.x });
const norm = (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x/l, y: a.y/l, z: a.z/l }; };

export function centroide(nodos, idExcluido) {
    const resto = nodos.filter(n => n.id !== idExcluido);
    if (resto.length === 0) return null;   // nodo aislado: no hay señal direccional
    let sx = 0, sy = 0, sz = 0;
    for (const n of resto) { sx += n.x || 0; sy += n.y || 0; sz += n.z || 0; }
    return { x: sx / resto.length, y: sy / resto.length, z: sz / resto.length };
}

// Vector unitario en espacio de pantalla, del centro del viewport al centro del área segura.
// Unifica escritorio (derecha) y mobile (arriba) en una sola fórmula. Ojo: en pantalla y+ es abajo.
export function ladoDestino(areaSegura, viewportW, viewportH) {
    const c = centroAreaSegura(areaSegura, viewportW, viewportH);
    const dx = c.x - viewportW / 2;
    const dy = c.y - viewportH / 2;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
}

// Órbita a radio fijo alrededor del nodo. `azimut` = atan2(aimOffsetX, aimDistance) reproduce
// exactamente el encuadre calibrado de aimAtNode cuando distancia = hypot(aimOffsetX, aimDistance).
// `lookAt` es el nodo EXACTO: el descentrado ya no se falsea corriendo el lookAt (eso hacía
// aimAtNode), lo hace la traslación de frustum con el área segura.
export function posicionCamaraParaFoco(nodo, signo, distancia, azimut) {
    const a = signo * azimut;
    return {
        pos: { x: nodo.x + distancia * Math.sin(a), y: nodo.y, z: nodo.z + distancia * Math.cos(a) },
        lookAt: { x: nodo.x, y: nodo.y, z: nodo.z },
    };
}

// ponytail: dos candidatos espejo en X elegidos por el centroide del grafo; si un nodo muy
// conectado sigue tirando aristas sobre el panel, acá se proyecta cada vecino y se elige el
// mejor de N ángulos (deferred, ver 03-CONTEXT.md).
export function elegirLadoOrbit(nodoEnfocado, nodos, areaSegura, viewportW, viewportH, distancia, azimut) {
    const c = centroide(nodos, nodoEnfocado.id);
    if (!c) return 1; // sin vecinos: no hay arista que evitar, default histórico "der"

    const objetivo = ladoDestino(areaSegura, viewportW, viewportH);
    let mejorSigno = 1, mejorScore = -Infinity;

    for (const signo of [1, -1]) {
        const { pos } = posicionCamaraParaFoco(nodoEnfocado, signo, distancia, azimut);
        const viewDir = norm(sub(nodoEnfocado, pos));
        const right = norm(cross(viewDir, { x: 0, y: 1, z: 0 }));
        const up = cross(right, viewDir);
        const hacia = sub(c, nodoEnfocado);
        // ponytail: con objetivo vertical (mobile) los dos candidatos empatan siempre — el par
        // de candidatos verticales entra acá si mobile lo necesita.
        const score = dot(hacia, right) * objetivo.x - dot(hacia, up) * objetivo.y;

        if (score > mejorScore) { mejorScore = score; mejorSigno = signo; }
    }
    return mejorSigno;
}
