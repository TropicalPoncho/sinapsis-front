---
status: testing
phase: 03-3d-engine
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md]
started: 2026-09-19T22:00:00Z
updated: 2026-09-19T22:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 6
name: Aristas hacia el lado libre
expected: |
  Abrir http://localhost:3002/?overlay=1&foco=<nodo> probando tropical-poncho, espora y
  serie-uno. Las aristas del nodo enfocado salen hacia el lado libre (38% derecho) y no cruzan
  por detrás de donde iría el panel; la cámara no queda 'detrás' de la red tapando el nodo.
awaiting: user response

## Tests

### 1. Carga inicial encuadrada
expected: la red aparece ya encuadrada tras el fundido desde negro, sin zoom tardío; vínculos conectados; consola limpia
result: pass
note: "reportado como issue (aparece con zoom, un solo nodo); corregido y re-verificado por el usuario (\"arreglado el issue\")"
fix: corregido en la sesión (animationManager.fadeInCanvasFromBlack espera a que todos los nodos tengan objeto y posición antes de zoomToFit); verificado con captura headless (cámara z=445, los 12 nodos en cuadro). Re-verificado por el usuario.

### 2. Filtrado y aditivo con fade
expected: con ?demo=transiciones, los nodos que salen se achican y los que entran crecen (800 ms), los que se quedan no se mueven; la consola dice 0 nodos movidos en ambos
result: pass
reason: confirmado por el usuario en el checklist 03-06 ("las transiciones ahora sí, se achican y vuelven a aparecer de a poco"; veredictos 0 y 0)

### 3. Foco en nodo Image dentro del área libre
expected: con ?overlay=1&foco=nudo, la imagen entra ENTERA en el 38% derecho y la cámara se queda ahí (no vuelve a un zoom general unos segundos después)
result: pass
note: "la imagen entra bien; el usuario observa que el ángulo/lado desde el que se enfoca no funciona bien — se trata en el test 6 (MOTR-11)"

### 4. Foco en nodo no-Image
expected: con ?overlay=1&foco=tropical-poncho, el centro del nodo cae en el 38% derecho, el derrame fuera del viewport se ve bien, y la cámara no vuelve sola a un zoom general
result: pass
note: "con tropical-poncho funciona bien. Con nudo (Image) la cámara va directo y queda 'atrás de la red' (la red tapa el nodo): ángulo de órbita, se trata en el test 6 (MOTR-11)"

### 5. Click en un nodo enfoca
expected: sin parámetros, hacer click en un nodo mueve la cámara a enfocarlo (ahora contra el área segura de desarrollo); hover anima el nodo; Mechi Botta (puntos y líneas) se puede agarrar con hover y click
result: pass
note: "anda bien; el usuario observó que al hacer click toda la red se corría unos píxeles antes de que la cámara se acercara (offset de área segura aplicado de golpe). Corregido: el offset ahora crece gradualmente con el tween de cámara. Pendiente re-verificar."

### 6. Aristas hacia el lado libre
expected: con ?overlay=1&foco=<nodo con vecinos> (probar tropical-poncho, espora y serie-uno), las aristas del nodo enfocado salen hacia el lado libre, sin cruzar por detrás de donde iría el panel
result: [pending]

### 7. Resize con nodo enfocado
expected: con ?overlay=1&foco=nudo, cambiar el tamaño de la ventana mantiene el nodo encuadrado en el área libre
result: [pending]

### 8. Liberación de recursos al reemplazar
expected: con ?nodos=800&demo=liberacion&perf=1, la tabla antes/después baja texturas (458 → ~10) y geometrías (~1364 → ~24), y los 12 nodos que quedan se ven bien, ninguno roto o en blanco
result: pass
reason: confirmado por el usuario con datos en el checklist 03-06 (texturas 257 → 10, sin nodos rotos tras las correcciones)

## Summary

total: 8
passed: 6
issues: 0
pending: 2
skipped: 0

## Gaps

- truth: "la red aparece ya encuadrada tras el fundido desde negro, sin zoom tardío"
  status: resolved
  reason: "User reported: aparece con zoom, se ve solo uno de los nodos."
  severity: major
  test: 1
  artifacts:
    - path: "src/engine/graph/animationManager.js"
      issue: "zoomToFit corría antes de que la librería creara y posicionara los objetos de los nodos; getGraphBbox mide con matrixWorld (todo en el origen) y el bbox salía diminuto"
  missing: []

- truth: "al hacer click en un nodo la cámara se acerca de forma fluida, sin correr antes toda la red"
  status: fixed-pending-reverify
  reason: "User reported: antes de acercarse se mueve toda la red unos píxeles a la derecha (offset de área segura de golpe)"
  severity: minor
  test: 5
  artifacts:
    - path: "src/engine/SinapsisEngine.js"
      issue: "_tick aplicaba applySafeArea completo apenas se fijaba _nodoEnfocado, antes de que el tween de cámara arrancara"
  missing: []
