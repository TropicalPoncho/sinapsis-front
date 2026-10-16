# Requirements: Sinápsis

**Defined:** 2026-08-06
**Core Value:** Que la red se pueda mirar desde cualquier punto de vista sin cambiar el modelo de datos.

## v1 Requirements

Milestone 1 — motor, Vistas y la web de Tropical Poncho como primer consumidor.
La data la carga el dueño por un pipeline de CSV versionado; no hay autenticación ni carga por creadxrs.

### Repositorio

- [x] **REPO-01**: El repo arranca sin rastros del intento con `react-force-graph-3d` — borrados `mundo.js`, `mundo2.js`, `NetworkContext` y los componentes del intento, y la dependencia fuera del `package.json`
- [x] **REPO-02**: Las dependencias (Next, React, three, TypeScript) están en versiones vigentes y `npm run build` pasa limpio
- [x] **REPO-03**: `src/engine/` contiene los `threeObjects/`, `cameraController`, `animationManager` y `constants` copiados desde `collectiveConscience`, incluidos `crossedLines`, `linkThreeObject`, `threeGlobal` y `background`
- [x] **REPO-04**: Existe un tipo `Vista` en TypeScript como contrato compartido —campos, transiciones y forma del subgrafo devuelto— que consumen tanto el backend de Vista como el motor, de modo que las fases 2 y 3 no diverjan al desarrollarse en paralelo
- [x] **REPO-05**: ~~Strapi vive en `strapi/` dentro de este repo~~ — **revertido el 2026-08-06**. Se cumplió en Fase 1 y luego se descartó: Strapi 5 gobierna el DDL de toda tabla que administra y no tiene opt-out confiable. Sobrevive la parte útil: `docker-compose.yml` levanta Postgres para desarrollo

### Datos

- [x] **DATA-01**: Existe un schema Postgres con tablas `nodos` y `vinculos` que refleja el modelo de la ERS, sin ningún campo `dimensionId`
- [x] **DATA-02**: `nodos` tiene columnas livianas (`id`, `node_type`, `subtipo`, `label`, `descripcion_breve`, `thumb`, `viz_params`, `is_stub`, `fecha`, `disciplina`, `location_id`, `created_by`) más un `metadata jsonb` para la ficha técnica, y la topología se consulta sin traer `metadata`
- [x] **DATA-09**: `nodeType` tiene exactamente cuatro valores estructurales —ENTIDAD, OBRA, EVENTO, AGRUPACION— y el nombre de la cosa (banda, dúo, colectivo, productora, centro cultural, serie, área, podcast) vive en `subtipo`, con vocabulario abierto validado contra la tabla `subtipos`
- [x] **DATA-10**: `nodos` y `vinculos` tienen `created_by` para auditoría, nullable y sin FK hasta que exista `usuarios`
- [x] **DATA-03**: `viz_params` guarda únicamente escalares (forma, color, velocidad, ruido, semilla) — nunca fragmentos de GLSL ni código
- [x] **DATA-04**: `vinculos` tiene `tipo_vinculo` como enum de strings nombrados, `rol` como texto corto filtrable aplicable a cualquier tipo, y `descripcion` como texto largo que **no** viaja en la topología — sin valor `CUSTOM` en el enum
- [x] **DATA-05**: El schema lo gobiernan migraciones SQL versionadas en el repo — ninguna herramienta externa autora ni altera el DDL, y las tablas no cargan columnas de bookkeeping ajenas al modelo
- [x] **DATA-06**: La data actual de Mongo (`config/dumps/` de `collectiveConscience`) queda migrada al modelo nuevo, con los `neuronType` y `synapseType` numéricos traducidos a los enums nombrados
- [x] **DATA-07**: El tipo `concept` del modelo viejo no se migra — se descarta con las categorías del sitio institucional
- [x] **DATA-08**: `descripcion_breve` está limitada a 200 caracteres a nivel de base — el tope es lo que mantiene enviable el dump de topología

### Vista

- [x] **VIST-01**: `resolverVista(adyacencia, vista)` es una función pura, sin framework y sin acceso a base de datos, que dado un nodo raíz devuelve el subgrafo aplicando profundidad, `filtroNodeTypes`, `filtroSubtipos`, `filtroVinculos`, `filtroRoles`, `direccion`, `filtroAtributos` y `limite`
- [x] **VIST-02**: La Vista acepta `incluirRaiz` y, en `false`, devuelve el subgrafo sin el nodo raíz
- [x] **VIST-03**: Dado un conjunto de nodos ya cargados, la misma función devuelve sus vecinos a un salto excluyendo los que ya están, para expandir la red al explorar sin pedir nada al servidor
- [x] **VIST-04**: El cliente recibe la topología una vez, construye el índice de adyacencia en memoria y resuelve todas las Vistas localmente — explorar no dispara peticiones de red
- [x] **VIST-05**: Un route handler de Next expone la topología (nodos livianos + vínculos) con dos consultas sin joins, y decide qué entra en ese dump — es el único punto que toca Postgres
- [x] **VIST-06**: Ninguna dimensión ni nivel de nodo se persiste — la distancia a la raíz se calcula siempre en el traversal
- [x] **VIST-07**: `resolverVista` no importa nada del browser ni del framework, de modo que la misma función pueda ejecutarse en el servidor el día que la topología no entre en el cliente

### Motor

- [x] **MOTR-01**: `SinapsisEngine` se monta sobre un elemento del DOM y expone `setVista(vista, { transicion })` y `on(evento, handler)` como única superficie pública
- [x] **MOTR-02**: El motor no importa React y React no importa THREE — un solo archivo de puente entre ambos
- [x] **MOTR-03**: La transición `reemplazo` cambia la red con fundido a negro y zoom, como el `goInto` actual
- [x] **MOTR-04**: La transición `filtrado` conserva las instancias y posiciones existentes y desvanece lo que queda fuera de la Vista
- [x] **MOTR-05**: La transición `aditivo` suma los nodos nuevos a los que ya están en pantalla
- [x] **MOTR-06**: Cualquier Vista se puede alcanzar con cualquiera de las tres transiciones — la transición no está atada a la consulta
- [x] **MOTR-07**: Al recambiar la red se liberan geometrías, materiales y texturas de los objetos que salen de escena
- [x] **MOTR-08**: El motor recibe el área segura del viewport de forma **continua** —no una vez por ruta, porque el scroll la modifica— y encuadra el nodo enfocado dentro de ella
- [x] **MOTR-09**: Las animaciones de cámara son esperables desde afuera, de modo que un cambio de ruta pueda secuenciar animación y overlay en vez de dispararlos en paralelo
- [x] **MOTR-10**: El encuadre depende de `vizParams.shape`: un nodo `Image` entra **entero** en el área segura porque la imagen es la obra y recortarla la mutila; cualquier otra forma solo necesita que su centro caiga adentro, y que se derrame fuera del viewport es deseable
- [x] **MOTR-11**: Al enfocar un nodo, el motor elige el ángulo de cámara para que las aristas del nodo salgan hacia el lado libre del viewport y no crucen por detrás del panel de texto — el panel nunca cambia de lado
- [x] **MOTR-12**: El motor reporta por `on` la posición proyectada en pantalla del nodo enfocado, un punto, para anclar rótulos o conectores desde el panel

### Interfaz

- [x] **UI-01**: El visitante ve una red 3D global al entrar y puede navegarla con mouse en escritorio y gestos en mobile
- [x] **UI-02**: Al tocar un nodo, el visitante ve su información y puede seguir explorando desde sus vínculos
- [x] **UI-03**: Existe una página de nodo ENTIDAD que muestra la red de esa entidad y sus obras producidas
- [x] **UI-04**: Existe una página de nodo OBRA que muestra su ficha y lxs creadxrs que colaboraron en ella
- [x] **UI-05**: La Vista activa está reflejada en la URL, de modo que el botón atrás del navegador retrocede por el historial de vistas y una vista se puede compartir por link (D-22: lo que se suma al recorrer es estado de sesión y no viaja en el link; el link reproduce la Vista ancla)
- [x] **UI-06**: El menú de navegación se renderiza desde la misma data que alimenta el grafo, sin construcción imperativa aparte
- [ ] **UI-07**: tropicalponcho.art funciona como la página de perfil del nodo ENTIDAD Tropical Poncho (subtipo `productora`), sin código específico para ese nodo
- [x] **UI-08**: El canvas 3D se monta una sola vez por encima del router y sobrevive a los cambios de ruta sin remontarse — el contenido de cada ruta flota encima
- [x] **UI-09**: Al enfocar un nodo, el panel de información aparece **siempre del mismo lado** —izquierda en escritorio ocupando el 62% del ancho, banda inferior en mobile— con degradado hacia el canvas y no un corte duro, y el texto alineado a la izquierda
- [ ] **UI-11**: La columna de texto se mantiene entre 620 y 680px aunque el panel sea más ancho: el panel crece como degradado, no como largo de línea
- [x] **UI-10**: Un cambio de ruta secuencia el cambio de Vista, la animación de cámara y la aparición del overlay, en vez de dispararlos a la vez
- [ ] **UI-12**: Las acciones del panel salen de los datos, no de configuración por nodo: "Entrar" aparece si el nodo compone algo (un COMPONE saliente) o tiene secciones derivadas, para cualquier tipo de nodo, y "Expandir" si una obra o un evento tiene contenido (créditos); un nodo puede tener las dos. Entrar es zoom in a la red interna del nodo (Fase 4.1, D-26)
- [ ] **UI-13**: Expandir abre una ficha de lectura por encima de todo el canvas sin mover la cámara, con el borde superior fundido con la escena y una cabecera fija con el nombre del nodo y el menú de sus secciones; Volver y Esc vuelven al preview (Fase 4.1, D-27)
- [x] **UI-14**: Los vínculos de participación de un nodo, agrupados por `rol` normalizado (roles múltiples, mayúsculas y plurales, vocabulario curado en datos, "Otros"), forman secciones virtuales que no se persisten; el mismo componente de UI muestra las secciones derivadas y las áreas reales de una entidad (Fase 4.1, D-29)
- [ ] **UI-15**: Entrar a una sección muestra a la izquierda la lista de sus nodos para pasar de uno a otro; cada uno se previsualiza, se expande o se entra, y su red muestra sus áreas reales o derivadas, recursivamente. Las listas son UI y no crean nodos de escena (tope 40 + 12) y la URL lleva solo el ancla (Fase 4.1, D-30, D-22)
- [ ] **UI-16**: El panel de preview ocupa el ancho libre entre el borde izquierdo (o el menú lateral) y la neurona, con la alineación como un valor de CSS (izquierda por defecto); en mobile el nombre de la red se ve grande a todo el ancho superior y el motor lo esquiva (Fase 4.1, D-28)

### Rendimiento

- [x] **PERF-01**: Está medido y documentado cuántos nodos sostiene el motor a 30 fps en un dispositivo de gama media, con el número de draw calls por nodo

## v2 Requirements

Diferidos a milestone 2. Reconocidos pero fuera del roadmap actual.

### Autenticación

- **AUTH-01**: Lx creadxr se registra con un código de invitación válido
- **AUTH-02**: Lx creadxr inicia sesión con Google o Instagram vía OAuth 2.0
- **AUTH-03**: Al registrarse se le crea una neurona esférica de color aleatorio
- **AUTH-04**: Lx creadxr personaliza el color de su neurona desde su perfil

### Carga de obras

- **OBRA-01**: Lx creadxr crea una obra con título, descripción, fecha, disciplina y ficha técnica
- **OBRA-02**: Lx creadxr sube imágenes y enlaza video de YouTube a una obra
- **OBRA-03**: Lx creadxr agrupa obras bajo una agrupación mediante vínculos `COMPONE`
- **OBRA-04**: Lx creadxr ve su galería con la mini-red arriba y la grilla de obras abajo

### Vínculos entre usuarios

- **VINC-01**: Lx creadxr propone un vínculo y quien lo recibe puede aceptarlo o rechazarlo
- **VINC-02**: Un vínculo no aparece en la red pública hasta ser aceptado
- **VINC-03**: Lx creadxr invita por email a alguien no registradx y se crea una ENTIDAD con `is_stub` en true
- **VINC-04**: Al registrarse, esa entidad deja de ser stub, se convierte en perfil completo y sus vínculos quedan activos

### Descubrimiento

- **BUSC-01**: El visitante busca por nombre de entidad o de obra
- **BUSC-02**: El visitante filtra la red por disciplina artística
- **BUSC-03**: El visitante filtra la red por región geográfica
- **BUSC-04**: El visitante sin sesión ve una red contextualizada por cercanía geográfica

## Out of Scope

| Feature | Reason |
|---------|--------|
| Neo4j o cualquier base de grafos | El traversal no lo hace ninguna base: lo hace un BFS sobre un Map de adyacencia en memoria. Postgres solo dumpea la topología con dos scans sin joins. Se revisa si la topología supera el millón de aristas o si hacen falta caminos ponderados en el request path |
| Strapi, o cualquier CMS que autore el DDL | Strapi 5 sincroniza el schema en cada boot sin opt-out confiable (`forceMigration: false` no funciona en Postgres, issue #15027 cerrado "not planned"), impone `document_id`/`published_at`/`locale` a toda tabla, y sus propios docs advierten pérdida de datos contra bases preexistentes. El schema es el activo central del proyecto. Además el dataset de v1 son ~50 nodos curados en planilla, y la UI de carga hay que construirla igual para v2 |
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
| REPO-01 | Phase 1 | Complete |
| REPO-02 | Phase 1 | Complete |
| REPO-03 | Phase 1 | Complete |
| REPO-04 | Phase 1 | Complete |
| REPO-05 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 2 | Complete |
| DATA-05 | Phase 2 | Complete |
| DATA-06 | Phase 2 | Complete |
| DATA-07 | Phase 2 | Complete |
| VIST-01 | Phase 2 | Complete |
| VIST-02 | Phase 2 | Complete |
| VIST-03 | Phase 2 | Complete |
| VIST-04 | Phase 2 | Complete |
| VIST-05 | Phase 2 | Complete |
| VIST-06 | Phase 2 | Complete |
| VIST-07 | Phase 2 | Complete |
| DATA-08 | Phase 2 | Complete |
| DATA-09 | Phase 2 | Complete |
| DATA-10 | Phase 2 | Complete |
| MOTR-01 | Phase 3 | Complete |
| MOTR-02 | Phase 3 | Complete |
| MOTR-03 | Phase 3 | Complete |
| MOTR-04 | Phase 3 | Complete |
| MOTR-05 | Phase 3 | Complete |
| MOTR-06 | Phase 3 | Complete |
| MOTR-07 | Phase 3 | Complete |
| MOTR-08 | Phase 3 | Complete |
| MOTR-09 | Phase 3 | Complete |
| MOTR-10 | Phase 3 | Complete |
| MOTR-11 | Phase 3 | Complete |
| MOTR-12 | Phase 3 | Complete |
| PERF-01 | Phase 3 | Complete |
| UI-01 | Phase 4 | Complete |
| UI-02 | Phase 4 | Complete |
| UI-03 | Phase 4 | Complete |
| UI-04 | Phase 4 (ampliado en 4.1) | Complete |
| UI-05 | Phase 4 | Complete |
| UI-06 | Phase 4 | Complete |
| UI-08 | Phase 4 | Complete |
| UI-09 | Phase 4 | Complete |
| UI-11 | Phase 4.1 | Pending |
| UI-10 | Phase 4 | Complete |
| UI-12 | Phase 4.1 | Pending |
| UI-13 | Phase 4.1 | Pending |
| UI-14 | Phase 4.1 | Complete |
| UI-15 | Phase 4.1 | Pending |
| UI-16 | Phase 4.1 | Pending |
| UI-07 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-06*
*Last updated: 2026-10-15 al planear la Fase 4.1 (UI-12..UI-16 nuevos; UI-11 pasa a la Fase 4.1)*
