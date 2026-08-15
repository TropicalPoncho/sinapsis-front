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
