# Phase 4: UI & Navigation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 04-ui-navigation
**Areas discussed:** Click y navegación por URL, Menú, Contenido de los paneles, Coreografía de transiciones

## Click y navegación por URL

| Pregunta | Opciones | Elegida |
|----------|----------|---------|
| Qué hace un click | Un click = ir a la página / Dos pasos: enfocar y entrar / Depende del tipo | Dos pasos: enfocar y después entrar |
| Forma de las URLs | Rutas por tipo / Ruta única /nodo/[id] / Todo en query sobre / | Rutas por tipo |
| Botón atrás | Cada navegación es un paso / Solo cambios de Vista | Cada navegación es un paso |
| Qué ve el visitante en la home | Red global completa / Red de Tropical centrada / Vista curada | **Otra:** una fracción de la red (obras y entidades, estilo feed de Instagram), no toda; tropicalponcho.art entra directo a la entidad con los agrupadores de primer nivel; filtros y controles de niveles después |
| Cómo se entra tras enfocar | Botón en el panel / Segundo click / Los dos | Botón en el panel — y el botón depende del tipo (obra: expande; entidad/área: carga sub-red; otros: enlaces externos); estandarizar por tipo con sub-botones |
| Cómo se elige la fracción de la home | Mezcla que cambia por visita / Los más conectados / Curada por el dueño | Mezcla de obras y entidades, cambia por visita |
| Click en otro nodo mientras hay foco | Enfoca ese nodo / Cierra el panel | Enfoca ese nodo |

## Menú

| Pregunta | Opciones | Elegida |
|----------|----------|---------|
| Qué muestra el menú de arriba | Agrupadores de la entidad en foco / Menú fijo del sitio / Depende del contexto | Agrupadores de la entidad en foco |
| Menú lateral en sub-red | Sí, lista de nodos / No / Solo en escritorio | Sí, lista de los nodos de la sub-red |
| Menú en mobile | Hamburguesa hacia abajo / Barra inferior | Hamburguesa hacia abajo |

## Contenido de los paneles

| Pregunta | Opciones | Elegida |
|----------|----------|---------|
| Panel al enfocar | Nombre+subtipo+descripción+botones / + thumb / Solo nombre y botones | Nombre, subtipo, descripción breve y botones |
| Ficha extendida de OBRA | Créditos / Texto largo / Galería / Enlaces externos | Todas, más un iframe de video de YouTube opcional |
| Obras de una ENTIDAD | Solo en la red al entrar / Lista dentro del panel | Solo en la red, al entrar |
| Stub o sin descripción | Panel mínimo con el nombre / Aviso de perfil no reclamado | Panel mínimo con el nombre |

## Coreografía de transiciones

| Pregunta | Opciones | Elegida |
|----------|----------|---------|
| Transición al entrar | Aditivo / Filtrado / Reemplazo / Cada tipo su transición | **Otra:** entidad = filtrado, área = reemplazo por defecto; configurable por el dueño de la entidad |
| Secuencia panel y cámara | La cámara llega y luego el panel / Panel en el último tramo | La cámara llega y recién ahí aparece el panel |
| Volver | Animación inversa / Siempre fundido a negro | La animación inversa |

## Claude's Discretion

Menú de la home social, mobile fino, pantalla de carga, fuente de datos mientras 02-05 está en
pausa, modelo del registro de acciones de botón, estilos visuales.

## Deferred Ideas

Filtros y selector de vista en la home; controles de niveles visibles y configuración por
entidad/usuario; edición del dueño de la transición (M2); carga progresiva; fade con opacidad;
ángulo de enfoque fino; dominio tropicalponcho.art (Fase 5).
