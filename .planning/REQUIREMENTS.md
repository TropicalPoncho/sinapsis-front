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
- [ ] **REPO-04**: Existe un tipo `Vista` en TypeScript como contrato compartido —campos, transiciones y forma del subgrafo devuelto— que consumen tanto el backend de Vista como el motor, de modo que las fases 2 y 3 no diverjan al desarrollarse en paralelo
- [ ] **REPO-05**: Strapi vive en `strapi/` dentro de este repo, con su propio `package.json`, y `docker-compose.yml` levanta Postgres para desarrollo

### Datos

- [ ] **DATA-01**: Existe un schema Postgres con tablas `nodos` y `vinculos` que refleja el modelo de la ERS, sin ningún campo `dimensionId`
- [ ] **DATA-02**: `nodos` tiene columnas livianas (`id`, `node_type`, `label`, `descripcion_breve`, `thumb`, `viz_params`, `is_stub`, `fecha`, `disciplina`, `location_id`) más un `metadata jsonb` para la ficha técnica, y la topología se consulta sin traer `metadata`
- [ ] **DATA-03**: `viz_params` guarda únicamente escalares (forma, color, velocidad, ruido, semilla) — nunca fragmentos de GLSL ni código
- [ ] **DATA-04**: `vinculos` tiene `tipo_vinculo` como enum de strings nombrados, `rol` como texto corto filtrable aplicable a cualquier tipo, y `descripcion` como texto largo que **no** viaja en la topología — sin valor `CUSTOM` en el enum
- [ ] **DATA-05**: Strapi autohosteado corre sobre ese mismo Postgres y permite crear, editar y borrar nodos y vínculos desde su panel
- [ ] **DATA-06**: La data actual de Mongo (`config/dumps/` de `collectiveConscience`) queda migrada al modelo nuevo, con los `neuronType` y `synapseType` numéricos traducidos a los enums nombrados
- [ ] **DATA-07**: El tipo `concept` del modelo viejo no se migra — se descarta con las categorías del sitio institucional
- [ ] **DATA-08**: `descripcion_breve` está limitada a 200 caracteres a nivel de base — el tope es lo que mantiene enviable el dump de topología

### Vista

- [ ] **VIST-01**: `resolverVista(adyacencia, vista)` es una función pura, sin framework y sin acceso a base de datos, que dado un nodo raíz devuelve el subgrafo aplicando profundidad, `filtroNodeTypes`, `filtroVinculos`, `filtroRoles`, `direccion`, `filtroAtributos` y `limite`
- [ ] **VIST-02**: La Vista acepta `incluirRaiz` y, en `false`, devuelve el subgrafo sin el nodo raíz
- [ ] **VIST-03**: Dado un conjunto de nodos ya cargados, la misma función devuelve sus vecinos a un salto excluyendo los que ya están, para expandir la red al explorar sin pedir nada al servidor
- [ ] **VIST-04**: El cliente recibe la topología una vez, construye el índice de adyacencia en memoria y resuelve todas las Vistas localmente — explorar no dispara peticiones de red
- [ ] **VIST-05**: Strapi expone un endpoint que dumpea la topología (nodos livianos + vínculos) con dos consultas sin joins, y decide qué entra en ese dump — es el único punto que toca Postgres
- [ ] **VIST-06**: Ninguna dimensión ni nivel de nodo se persiste — la distancia a la raíz se calcula siempre en el traversal
- [ ] **VIST-07**: `resolverVista` no importa nada del browser ni de Strapi, de modo que la misma función pueda ejecutarse en el servidor el día que la topología no entre en el cliente

### Motor

- [ ] **MOTR-01**: `SinapsisEngine` se monta sobre un elemento del DOM y expone `setVista(vista, { transicion })` y `on(evento, handler)` como única superficie pública
- [ ] **MOTR-02**: El motor no importa React y React no importa THREE — un solo archivo de puente entre ambos
- [ ] **MOTR-03**: La transición `reemplazo` cambia la red con fundido a negro y zoom, como el `goInto` actual
- [ ] **MOTR-04**: La transición `filtrado` conserva las instancias y posiciones existentes y desvanece lo que queda fuera de la Vista
- [ ] **MOTR-05**: La transición `aditivo` suma los nodos nuevos a los que ya están en pantalla
- [ ] **MOTR-06**: Cualquier Vista se puede alcanzar con cualquiera de las tres transiciones — la transición no está atada a la consulta
- [ ] **MOTR-07**: Al recambiar la red se liberan geometrías, materiales y texturas de los objetos que salen de escena
- [ ] **MOTR-08**: El motor recibe un área segura del viewport y encuadra el nodo enfocado dentro de ella, y reporta por `on` la región de pantalla que ese nodo ocupa, para que la UI decida de qué lado poner el panel
- [ ] **MOTR-09**: Las animaciones de cámara son esperables desde afuera, de modo que un cambio de ruta pueda secuenciar animación y overlay en vez de dispararlos en paralelo

### Interfaz

- [ ] **UI-01**: El visitante ve una red 3D global al entrar y puede navegarla con mouse en escritorio y gestos en mobile
- [ ] **UI-02**: Al tocar un nodo, el visitante ve su información y puede seguir explorando desde sus vínculos
- [ ] **UI-03**: Existe una página de nodo ESPACIO que muestra la red de ese espacio y sus obras producidas
- [ ] **UI-04**: Existe una página de nodo OBRA que muestra su ficha y los artistas que colaboraron en ella
- [ ] **UI-05**: La Vista activa está reflejada en la URL, de modo que el botón atrás del navegador retrocede por el historial de vistas y una vista se puede compartir por link
- [ ] **UI-06**: El menú de navegación se renderiza desde la misma data que alimenta el grafo, sin construcción imperativa aparte
- [ ] **UI-07**: tropicalponcho.art funciona como la página de perfil del nodo ESPACIO Tropical Poncho, sin código específico para ese nodo
- [ ] **UI-08**: El canvas 3D se monta una sola vez por encima del router y sobrevive a los cambios de ruta sin remontarse — el contenido de cada ruta flota encima
- [ ] **UI-09**: Al enfocar un nodo, el panel de información aparece con scrim sobre la zona de texto y la zona donde quedó la neurona se mantiene transparente — izquierda en escritorio, arriba en mobile
- [ ] **UI-10**: Un cambio de ruta secuencia el cambio de Vista, la animación de cámara y la aparición del overlay, en vez de dispararlos a la vez

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

| Requirement | Phase | Status |
|-------------|-------|--------|
| REPO-01 | Phase 1 | Pending |
| REPO-02 | Phase 1 | Pending |
| REPO-03 | Phase 1 | Pending |
| REPO-04 | Phase 1 | Pending |
| REPO-05 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| DATA-06 | Phase 2 | Pending |
| DATA-07 | Phase 2 | Pending |
| VIST-01 | Phase 2 | Pending |
| VIST-02 | Phase 2 | Pending |
| VIST-03 | Phase 2 | Pending |
| VIST-04 | Phase 2 | Pending |
| VIST-05 | Phase 2 | Pending |
| VIST-06 | Phase 2 | Pending |
| VIST-07 | Phase 2 | Pending |
| DATA-08 | Phase 2 | Pending |
| MOTR-01 | Phase 3 | Pending |
| MOTR-02 | Phase 3 | Pending |
| MOTR-03 | Phase 3 | Pending |
| MOTR-04 | Phase 3 | Pending |
| MOTR-05 | Phase 3 | Pending |
| MOTR-06 | Phase 3 | Pending |
| MOTR-07 | Phase 3 | Pending |
| MOTR-08 | Phase 3 | Pending |
| MOTR-09 | Phase 3 | Pending |
| PERF-01 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |
| UI-04 | Phase 4 | Pending |
| UI-05 | Phase 4 | Pending |
| UI-06 | Phase 4 | Pending |
| UI-08 | Phase 4 | Pending |
| UI-09 | Phase 4 | Pending |
| UI-10 | Phase 4 | Pending |
| UI-07 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-06*
*Last updated: 2026-08-06 after confirming the canvas-as-background interaction model*
