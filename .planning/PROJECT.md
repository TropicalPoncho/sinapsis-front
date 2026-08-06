# Sinápsis

## What This Is

Red social para artistas y obra colectiva, visualizada como una red neuronal 3D navegable.
Cada artista, obra, serie, espacio cultural y evento es un **nodo**; cada colaboración es un
**vínculo**. Está pensada para artistas, productoras, centros culturales y curadores que
quieren mostrar su trabajo y hacer visible con quién lo hicieron.

El descubrimiento es el producto: se explora siguiendo vínculos, no scrolleando un feed.

## Core Value

Que la red se pueda mirar desde cualquier punto de vista sin cambiar el modelo de datos.
La misma red tiene que poder mostrarse centrada en un artista, en una obra, en un espacio
o de forma global — y eso es configuración de una **Vista**, nunca un campo del nodo.

## Requirements

### Validated

Capacidades ya probadas en producción en `collectiveConscience` (tropicalponcho.art).
Se migran, no se reinventan.

- ✓ Renderizado 3D de nodos con shaders GLSL propios por tipo de objeto — existente
- ✓ Registry de tipos de objeto 3D con auto-registro por convención (`ThreeObjectManager`) — existente
- ✓ Layout de fuerzas, picking y hover sobre el grafo (`3d-force-graph`) — existente
- ✓ Control de cámara: aim a nodo, vuelta a vista general, resize (`CameraController`) — existente
- ✓ Transiciones de red con fundido a negro y zoom (`AnimationManager`) — existente
- ✓ Liberación de geometrías/materiales/texturas al recambiar la red — existente

### Active

Milestone 1 — motor, Vistas y la web de Tropical Poncho como primer consumidor.

- [ ] Schema Postgres `nodos` / `vinculos` según el modelo de la ERS, sin `dimensionId`
- [ ] Strapi autohosteado sobre ese Postgres para cargar y editar la data
- [ ] Migración de la data actual de Mongo (`config/dumps/`) al modelo nuevo
- [ ] Endpoint de Vista: dado raíz + profundidad + filtros, devuelve el subgrafo
- [ ] `incluirRaiz` como parámetro de Vista, no como caso especial del código
- [ ] `SinapsisEngine`: motor 3D vanilla con `setVista(vista, {transicion})` y `on()`
- [ ] Tres transiciones: `reemplazo`, `filtrado`, `aditivo`
- [ ] La Vista vive en la URL — el botón atrás del browser es el stack de navegación
- [ ] UI Next: home global, página de nodo ESPACIO, página de nodo OBRA
- [ ] Menú lateral renderizado desde la misma data que el grafo
- [ ] tropicalponcho.art funcionando como página de perfil del ESPACIO Tropical Poncho

### Out of Scope

**Diferido a milestone 2** (decisión de alcance, no de valor):

- Autenticación OAuth y registro por invitación — en M1 la data la carga el dueño por Strapi
- Carga de obras por artistas, subida de material audiovisual, permisos y moderación
- Flujo de aceptación/rechazo de vínculos (`estado: PENDIENTE`) — sin usuarios no hay quién acepte
- Nodos STUB e invitación por email a colaboradores no registrados
- Búsqueda por nombre y filtros por disciplina/geografía
- Series como agrupación curatorial navegable

**Descartado con razón** (no volver a proponerlo sin dato nuevo):

- Neo4j o cualquier base de grafos — la exploración por frontera es una secuencia de saltos
  de profundidad 1, que es un join indexado; el traversal profundo no está en el roadmap.
  Dos bases significan escrituras sin transacción compartida y drift garantizado.
- `react-three-fiber` o cualquier wrapper React sobre THREE — ya se intentó en la rama
  `task/Refactor-en-React` de este repo y falló. El motor es imperativo por diseño.
- Monorepo o paquete npm para el motor — un solo consumidor, no hay nada que compartir
- `CUSTOM` en el enum de tipo de vínculo — un tipo libre no se puede traversar ni filtrar;
  el escape hatch es el campo `rol`, que es texto libre
- Segunda base de datos para la "data profunda" del nodo — es una columna `jsonb`
- Instancing y LOD — se difiere hasta medir el techo real de render, no antes
- Modo AR (`aframe` / `ar.js`) — es del prototipo viejo, no está en la ERS

## Context

**De dónde viene esto.** Existe `collectiveConscience`, el sitio institucional de la productora
Tropical Poncho, en producción. Es un prototipo Express + Mongo + jQuery + Materialize con un
motor 3D propio que funciona bien. Ese motor es lo único que se rescata; el resto es de otro
producto y se queda donde está — el sitio sigue vivo y no se toca.

**Este repo.** `sinapsis-front` ya existía (feb–may 2025): Next 15 + React 19 + TS + Tailwind,
con `threeObjects/` ya copiado. Contiene además un intento fallido de integrar el motor vía
`react-force-graph-3d`, en la rama `task/Refactor-en-React` con cambios sin commitear. Ese
intento se descarta pero la rama queda intacta. La copia de `threeObjects/` de este repo está
desactualizada respecto a la de `collectiveConscience` (le faltan `crossedLines`, `linkThreeObject`,
`threeGlobal`, `background`): la fuente de verdad es la de `collectiveConscience`.

**La deuda técnica central.** El prototipo usa `dimensionId` como campo persistente del nodo para
decidir en qué nivel se muestra. Eso rompe apenas el mismo nodo tiene que aparecer en niveles
distintos según desde dónde se lo mire. En el código vive en `dataLoader.insertNetworkByDimension`,
`mundo.dimension`, `mundo.goIntoNeuron` y `state.level` de `index.js`. No es un refactor: se
reemplaza por el traversal de la Vista.

**El dolor concreto que hay que resolver.** Entrar a una sub-red (tocar OBRAS y ver las obras de
Tropical) hoy es un solo camino hardcodeado: fundido a negro + reemplazo total + menú lateral.
El tipo de carga viaja como atributo HTML de un botón (`loadType`) hasta `loadNext()`, y el
"volver" tiene un solo slot de snapshot, o sea que solo se puede retroceder un nivel. Se necesita
poder elegir entre mostrar la sub-red reemplazando, filtrando en el lugar o sumando nodos — y
que eso sea independiente de qué nodos se traen.

**Documentación de producto.** La ERS completa, el modelo de grafo y los ADRs de data model viven
en Notion y son la fuente de verdad funcional:
- ERS: https://app.notion.com/p/3533d6cb9a588140a0f1f6c029ac160e
- Modelo de grafo y visualización: https://app.notion.com/p/3543d6cb9a588182998ad5462e20f491
- Architecture Decisions — Data Model: https://app.notion.com/p/3553d6cb9a5881249f41f248261752aa

## Constraints

- **Tech stack**: Next 15 + React 19 + TypeScript + Tailwind — ya está en el repo, no se reabre
- **Tech stack**: Postgres único como fuente de verdad; Strapi autohosteado encima del mismo Postgres
- **Arquitectura**: el motor 3D es vanilla y no importa React; React no importa THREE.
  Un único archivo de puente entre ambos
- **Arquitectura**: el canvas 3D es fondo full-screen permanente y nunca se desmonta.
  Vive por encima del router; las rutas son overlays flotantes sobre un espacio 3D continuo.
  Toda acción de la UI va acompañada de una animación 3D — no son sistemas independientes
- **Performance**: la red 3D tiene que ir fluida en dispositivos de gama media (RNF-03 de la ERS).
  El techo real es la GPU, no la base: hoy cada nodo es un draw call
- **Datos**: los parámetros visuales del nodo son escalares en la base, nunca código.
  Si un nodo pudiera traer GLSL propio, instancing queda descartado para siempre
- **Compatibilidad**: `collectiveConscience` sigue en producción y no se modifica

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Repo existente `sinapsis-front`, no uno nuevo | Ya tiene el andamio de Next y `threeObjects/` portado; crear un tercero es trabajo sin ganancia | — Pending |
| `.planning/` versionado en `sinapsis-front` | El modo multi-repo de GSD fuerza planning local sin versionar; mover después es un `git mv` | — Pending |
| Postgres único, sin Neo4j | La exploración por frontera son saltos de profundidad 1 (joins indexados); búsqueda y geo son nativos de Postgres; dos bases = drift sin transacción compartida | — Pending |
| La topología vive en el cliente, no en el servidor | La topología es idéntica para todos; la Vista es de cada uno. A escala v1 el grafo entero son ~225KB de JSON, así que entra en el browser con margen. Explorar queda instantáneo, sin round trip por salto. El cruce donde conviene mover el traversal al servidor es ~20-50k nodos | — Pending |
| `resolverVista` es una función pura sin framework | Corre en el browser hoy y en el servidor el día que la topología no entre en el cliente, sin reescribirse. No es preparar el futuro: es una función sin dependencias que se puede ejecutar en los dos lados | — Pending |
| Postgres nunca traversa | Hace dos scans sin joins para dumpear la topología; el recorrido es un BFS sobre un Map de adyacencia. Por eso ninguna base de grafos aportaba: esa parte no la hace una base, la hace una estructura en memoria | — Pending |
| Tipado de vínculos en tres niveles | `tipoVinculo` estructural (cómo se traversa), `rol` semántico y filtrable ("dj", "cita directa"), `descripcion` narrativa. Los dos primeros viajan en la topología; el tercero se pide al abrir el vínculo | — Pending |
| Motor 3D vanilla, sin react-three-fiber | El motor es imperativo (uniforms mutables, registry por tipo); r3f obliga a un wrapper por objeto. Ya falló en este repo | — Pending |
| `tipoVinculo` (enum) + `rol` (texto libre) como ejes separados | El enum define cómo se traversa; el rol es el matiz humano. Autor de pintura, director de arte y dj son todos `COLABORO_EN` con rol distinto | — Pending |
| La Vista es la URL | Reemplaza `dimension`, `state.level` y `previousNetworkSnapshot`; regala historial de N niveles, deep links y vistas compartibles | — Pending |
| Transición separada de la consulta | Cualquier Vista alcanzable con cualquier transición; hoy están atadas y por eso entrar a una sub-red obliga al fundido a negro | — Pending |
| `incluirRaiz` como campo de Vista | Ya existe enterrado como `hideRoot`; subirlo a la Vista es lo que habilita "las obras del artista sin el artista" | — Pending |
| Web de Tropical = página de perfil de un ESPACIO | Si sale sin código especial, prueba que el modelo sirve para cualquier productora o centro cultural | — Pending |
| Instancing diferido hasta medir | El techo de render se estima pero no se midió; optimizar antes de medir es adivinar | — Pending |
| Strapi en `strapi/` del mismo repo, no en `sinapsis-back` | `.planning/` vive acá y la fase 2 toca schema, Strapi y endpoint a la vez; con dos repos cada commit se parte y GSD trackea uno solo. Dónde vive el archivo es independiente de que el proceso corra aparte | — Pending |
| Canvas persistente bajo el router, páginas como overlays | El canvas es el corazón del sistema, no un componente de una página. Montarlo por ruta cortaría la continuidad 3D que es el producto. Además elimina la segunda instancia del motor que parecía necesitar la galería | — Pending |
| El puente React↔motor es bidireccional | React le pasa el área segura del viewport para que la cámara encuadre el nodo fuera del panel; el motor reporta dónde quedó el nodo en pantalla para ubicar el scrim. Ya existe a medias como `aimAtNode` devolviendo `izq`/`der` | — Pending |
| Contrato `Vista` definido antes que las fases 2 y 3 | Las dos corren en paralelo y las dos dependen de esa forma; sin un tipo compartido divergen y hay que remendar en la fase 4 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-06 after initialization*
