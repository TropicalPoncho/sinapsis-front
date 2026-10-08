# Fase 4 - Gaps del UAT (2026-10-07)

Cada gap sale del UAT del dueño (ver `04-SMOKE.md`). Orden propuesto por impacto.

## Decisiones de diseño que salen de la devolución (van primero)

1. **Navegar por un crédito construye la red, no la reemplaza.** Tocar un colaborador desde un evento agrega su nodo y el vínculo con el evento a la red visible; ir atrás o a "todas las obras" lo conserva, así la red se arma en profundidad. Al traerlo se dibujan además sus vínculos con los nodos ya presentes, y puede ofrecer sus obras para sumarlas ahí mismo. Es el modo "recorrer" (nodo a nodo); entrar a una entidad sigue siendo el modo "red de la entidad", según la config de la entidad o la default. Alternativa descartada: reemplazar la Vista al tocar un crédito (es lo que hay hoy y deja la pantalla en negro). Riesgo hasta que se haga: el estado de la red acumulada no tiene dónde vivir (la Vista vive en la URL), hay que decidir cómo se serializa.
2. **Entrar a un área o entidad es "zoom in a la neurona", luego zoom in a la red interna.** Primero la cámara se acerca y el panel dice algo del área, como en una entidad; recién después se ingresa. Hoy se ve como zoom out. Tropical, ya adentro, no se muestra flotando inconexo.
3. **Dentro de la red de una entidad, tocar otra entidad** debe tener un criterio definido de qué se muestra; hoy cambia el foco a la otra y aparecen nodos sin relación.

## Gaps

| id | punto | requisito | síntoma | prioridad |
|----|-------|-----------|---------|-----------|
| G-06 | 8 | PERF-01, UI-08 | Celular: al tocar Tropical, pantalla blanca; `WebGL context ... caused context loss and was blocked`. Sospecha: el fondo nuevo (4000 estrellas + montaña de ~195k segmentos) o contextos que no se liberan al navegar | alta, bloquea mobile |
| G-03 | 5 | D-18, UI-03 | Área: sin info previa, zoom out en vez de in, Tropical flotando | alta |
| G-04 | 6 | UI-02, UI-04 | Crédito deja la pantalla en negro; ver decisión 1 | alta |
| G-05 | 7 | UI-03 | Entidad dentro de otra red: aparecen nodos ajenos; ver decisión 3 | media |
| G-01 | 2 | UI-10 | Celu, Volver: salto a la neurona del centro y vuelve | media |
| G-02 | 4 | UI-10 | Orden: ocultar panel, luego cambiar contenido | media |
| G-07 | 8 | UI-09 | "Sinápsis" cortada por el borde izquierdo; con título de entidad queda tapada. Moverla abajo o reemplazar por logo | baja |

## Estado tras 04-08..04-11 (UAT del dueño 2, 2026-10-08)

Evidencia: filas de "Re-smoke tras el cierre de gaps" y "UAT del dueño 2" en `04-SMOKE.md`. El dueño respondió en bloque ("esta ok"); un gap figura "cerrado por el dueño" solo si lo nombró, y si no, "cerrado por re-smoke, sin confirmación explícita del dueño".

| id | estado | evidencia |
|----|--------|-----------|
| G-01 | cerrado por re-smoke, sin confirmación explícita del dueño | re-smoke G-01 (1280x800 y 390x800); UAT punto 2 sin respuesta explícita. Ver G-09 por el Volver de Obras |
| G-02 | cerrado por re-smoke, sin confirmación explícita del dueño | re-smoke G-02 (ambos viewports); UAT punto 1 sin respuesta explícita |
| G-03 | cerrado por re-smoke; el dueño lo aceptó con ajustes | re-smoke G-03 (previsualiza, entra, Atrás); UAT punto 3: pide G-08 y G-10. La enmienda de D-16 (zoom in) la confirmó |
| G-04 | cerrado por re-smoke, sin confirmación explícita del dueño | re-smoke G-04 y las filas de D-22; UAT punto 5 sin respuesta explícita |
| G-05 | cerrado por re-smoke, sin confirmación explícita del dueño | re-smoke G-05 (enfocar y entrar/Atrás); UAT punto 7 sin respuesta explícita |
| G-06 | abierto: sin verificar en el celular | re-smoke: un solo canvas y consola sin errores, y los archivos de G-06 sin tocar. El dueño no reportó pantalla blanca ni fluidez (UAT puntos 10 y 12). No se cierra sin esa respuesta |
| G-07 | cerrado por el dueño | re-smoke G-07; UAT punto 9: "Sinapsis ok" |

Hueco de datos (curaduría 02-05, no código): 5 de las 6 áreas reales de Tropical no tienen miembros cargados (solo "Obras", 16), y adentro dicen "Todavía no hay nada acá". El dueño lo dio por bueno (UAT punto 8). La curaduría en curso descarta Editorial y suma "Nosotrxs" (área conceptual base, hoy rotulada "Nosotres", con COMPONE desde Tropical); si Nosotrxs está siempre presente en todo perfil de entidad o proyecto queda **abierto, sin decidir**.

## Gaps nuevos del UAT 2 (abiertos; los resuelve un plan de cierre 04-12)

| id | punto | requisito | síntoma | prioridad |
|----|-------|-----------|---------|-----------|
| G-08 | 3 | UI-03 | La vista de entrada de una ENTIDAD (p. ej. Tropical Poncho) debe mostrar **solo sus áreas** (AGRUPACION) **más el nodo raíz** de la entidad (esta vez incluido), con las áreas **conectadas entre sí** para una vista más limpia. Los vínculos entre áreas son **virtuales y derivados**: si un nodo que es parte de un área se vincula con un nodo de otra área, eso genera un vínculo virtual entre las dos áreas (no se persiste; relaciones curadas entre áreas podrían reemplazarlos después). Nota de datos: hoy solo Obras tiene miembros, así que los derivados salen vacíos hasta que se curen más | alta |
| G-09 | 3 | UI-10, D-18 | "Volver" no funcionó dentro del área Obras (el VOLVER del lateral y/o el Volver del panel; a diagnosticar). El re-smoke con la fixture lo recorrió bien, así que queda sin diagnosticar (hipótesis a verificar: los datos reales, 16 obras y 17 PRECEDE, o el estado del recorrido del dueño) | alta |
| G-10 | 3 | UI-06, UI-09 | Al entrar a un área el menú superior debe mostrarla como **activa** (desktop) y el nombre de la entidad ("Tropical Poncho") debe **quedarse en el mismo lugar arriba a la izquierda** (hoy el título pasa a ser el nombre del área); al entrar se ve el menú lateral con las obras del área, según la captura de diseño del dueño. Incluye la respuesta 3b: el menú superior queda visible al previsualizar un área | media |

## Temas abiertos (no son gaps)

- **Dos formas de moverse.** "Ingresar" (a una entidad, un área o una obra: zoom in, reemplazo) y "ir scrolleando por la red" (movimiento lateral: de un evento ver sus artistas ocultando el resto; de un artista sumar sus últimas obras; aditivo/filtrado, estilo feed con nodos precargados que aparecen y se van). El dueño: "Vayamos por esto por ahora": se prioriza la vista de entrada de la entidad y la maqueta de entrada a un área (G-08..G-10). "Tenemos que pensar bien todo esto." Conecta con el estado efímero de D-22.
- **Nosotrxs como área siempre presente** para todo perfil: sin decidir (ver hueco de datos).
