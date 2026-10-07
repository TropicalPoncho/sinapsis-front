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
