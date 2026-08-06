# Requirements: Sinápsis

**Defined:** 2026-08-06
**Core Value:** Que la red se pueda mirar desde cualquier punto de vista sin cambiar el modelo de datos.

## v1 Requirements

Milestone 1 — motor, Vistas y la web de Tropical Poncho como primer consumidor.
La data la carga el dueño por Strapi; no hay autenticación ni carga por artistas.

### Repositorio

- [ ] **REPO-01**: El repo arranca sin rastros del intento con `react-force-graph-3d` — borrados `mundo.js`, `mundo2.js`, `NetworkContext` y los componentes del intento, y la dependencia fuera del `package.json`
- [ ] **REPO-02**: Las dependencias (Next, React, three, TypeScript) están en versiones vigentes y `npm run build` pasa limpio
- [ ] **REPO-03**: `src/engine/` contiene los `threeObjects/`, `cameraController`, `animationManager` y `constants` copiados desde `collectiveConscience`, incluidos `crossedLines`, `linkThreeObject`, `threeGlobal` y `background`

### Datos

- [ ] **DATA-01**: Existe un schema Postgres con tablas `nodos` y `vinculos` que refleja el modelo de la ERS, sin ningún campo `dimensionId`
- [ ] **DATA-02**: `nodos` tiene columnas livianas (`id`, `node_type`, `label`, `thumb`, `viz_params`, `is_stub`, `location_id`) más un `metadata jsonb` para la ficha técnica, y el grafo se consulta sin traer `metadata`
- [ ] **DATA-03**: `viz_params` guarda únicamente escalares (forma, color, velocidad, ruido, semilla) — nunca fragmentos de GLSL ni código
- [ ] **DATA-04**: `vinculos` tiene `tipo_vinculo` como enum de strings nombrados y `rol` como texto libre aplicable a cualquier tipo, sin valor `CUSTOM` en el enum
- [ ] **DATA-05**: Strapi autohosteado corre sobre ese mismo Postgres y permite crear, editar y borrar nodos y vínculos desde su panel
- [ ] **DATA-06**: La data actual de Mongo (`config/dumps/` de `collectiveConscience`) queda migrada al modelo nuevo, con los `neuronType` y `synapseType` numéricos traducidos a los enums nombrados
- [ ] **DATA-07**: El tipo `concept` del modelo viejo no se migra — se descarta con las categorías del sitio institucional

### Vista

- [ ] **VIST-01**: Dado un nodo raíz, una profundidad y filtros de `nodeType` y `tipo_vinculo`, el sistema devuelve el subgrafo correspondiente
- [ ] **VIST-02**: La Vista acepta `incluirRaiz` y, en `false`, devuelve el subgrafo sin el nodo raíz
- [ ] **VIST-03**: Dado un conjunto de nodos ya cargados, el sistema devuelve sus vecinos a un salto excluyendo los que ya están, para expandir la red al explorar
- [ ] **VIST-04**: La topología del grafo se mantiene en memoria en el proceso Node y se sirve desde ahí, sin ida y vuelta a la base por salto
- [ ] **VIST-05**: La Vista se resuelve por un endpoint propio de Strapi, de modo que Postgres tenga una sola puerta de acceso
- [ ] **VIST-06**: Ninguna dimensión ni nivel de nodo se persiste — la distancia a la raíz se calcula siempre en el traversal

### Motor

- [ ] **MOTR-01**: `SinapsisEngine` se monta sobre un elemento del DOM y expone `setVista(vista, { transicion })` y `on(evento, handler)` como única superficie pública
- [ ] **MOTR-02**: El motor no importa React y React no importa THREE — un solo archivo de puente entre ambos
- [ ] **MOTR-03**: La transición `reemplazo` cambia la red con fundido a negro y zoom, como el `goInto` actual
- [ ] **MOTR-04**: La transición `filtrado` conserva las instancias y posiciones existentes y desvanece lo que queda fuera de la Vista
- [ ] **MOTR-05**: La transición `aditivo` suma los nodos nuevos a los que ya están en pantalla
- [ ] **MOTR-06**: Cualquier Vista se puede alcanzar con cualquiera de las tres transiciones — la transición no está atada a la consulta
- [ ] **MOTR-07**: Al recambiar la red se liberan geometrías, materiales y texturas de los objetos que salen de escena

### Interfaz

- [ ] **UI-01**: El visitante ve una red 3D global al entrar y puede navegarla con mouse en escritorio y gestos en mobile
- [ ] **UI-02**: Al tocar un nodo, el visitante ve su información y puede seguir explorando desde sus vínculos
- [ ] **UI-03**: Existe una página de nodo ESPACIO que muestra la red de ese espacio y sus obras producidas
- [ ] **UI-04**: Existe una página de nodo OBRA que muestra su ficha y los artistas que colaboraron en ella
- [ ] **UI-05**: La Vista activa está reflejada en la URL, de modo que el botón atrás del navegador retrocede por el historial de vistas y una vista se puede compartir por link
- [ ] **UI-06**: El menú de navegación se renderiza desde la misma data que alimenta el grafo, sin construcción imperativa aparte
- [ ] **UI-07**: tropicalponcho.art funciona como la página de perfil del nodo ESPACIO Tropical Poncho, sin código específico para ese nodo

### Rendimiento

- [ ] **PERF-01**: Está medido y documentado cuántos nodos sostiene el motor a 30 fps en un dispositivo de gama media, con el número de draw calls por nodo

## v2 Requirements

Diferidos a milestone 2. Reconocidos pero fuera del roadmap actual.

### Autenticación

- **AUTH-01**: El artista se registra con un código de invitación válido
- **AUTH-02**: El artista inicia sesión con Google o Instagram vía OAuth 2.0
- **AUTH-03**: Al registrarse se le crea una neurona esférica de color aleatorio
- **AUTH-04**: El artista personaliza el color de su neurona desde su perfil

### Carga de obras

- **OBRA-01**: El artista crea una obra con título, descripción, fecha, disciplina y ficha técnica
- **OBRA-02**: El artista sube imágenes y enlaza video de YouTube a una obra
- **OBRA-03**: El artista agrupa obras bajo una serie mediante vínculos `COMPONE`
- **OBRA-04**: El artista ve su galería con la mini-red arriba y la grilla de obras abajo

### Vínculos entre usuarios

- **VINC-01**: El artista propone un vínculo a un colaborador y este puede aceptarlo o rechazarlo
- **VINC-02**: Un vínculo no aparece en la red pública hasta ser aceptado
- **VINC-03**: El artista invita por email a un colaborador no registrado y se crea un nodo STUB
- **VINC-04**: Al registrarse, el nodo STUB se convierte en perfil completo y sus vínculos quedan activos

### Descubrimiento

- **BUSC-01**: El visitante busca por nombre de artista o de obra
- **BUSC-02**: El visitante filtra la red por disciplina artística
- **BUSC-03**: El visitante filtra la red por región geográfica
- **BUSC-04**: El visitante sin sesión ve una red contextualizada por cercanía geográfica

## Out of Scope

| Feature | Reason |
|---------|--------|
| Neo4j o cualquier base de grafos | La exploración por frontera son saltos de profundidad 1, que es un join indexado. Dos bases significan escrituras sin transacción compartida y drift garantizado. Se revisa si la topología supera el millón de aristas o si hacen falta caminos ponderados en el request path |
| `react-three-fiber` o wrappers React sobre THREE | El motor es imperativo por diseño (uniforms mutables, registry por tipo). Ya se intentó en la rama `task/Refactor-en-React` de este repo y falló |
| Segunda base para la "data profunda" del nodo | Es una columna `jsonb` en la misma tabla. Dos bases obligan a sincronizar sin transacción |
| `CUSTOM` en el enum de tipo de vínculo | Un tipo libre no se puede traversar ni filtrar desde la Vista. El escape hatch es el campo `rol` |
| Monorepo o paquete npm para el motor | Un solo consumidor. Se extrae cuando aparezca el segundo |
| Instancing y LOD | Se difiere hasta tener el número de PERF-01. Optimizar antes de medir es adivinar |
| Modo AR (`aframe` / `ar.js`) | Es del prototipo viejo y no aparece en la ERS |
| Comentarios en obras, compartir en redes externas, venta de entradas | v2 y v3 de la ERS |
| Modificar `collectiveConscience` | Sigue en producción como sitio de la productora. Se lee, no se toca |

## Traceability

Se completa durante la creación del roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| — | — | Pendiente de roadmap |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 0
- Unmapped: 31 ⚠️ (se resuelve al crear el roadmap)

---
*Requirements defined: 2026-08-06*
*Last updated: 2026-08-06 after initial definition*
