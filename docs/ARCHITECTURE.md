# Sinápsis — Arquitectura (C4)

> **Qué es este documento.** Los diagramas C4 del sistema: contexto, contenedores y componentes.
> Muestra **estructura**, no decisiones. El *por qué* de cada elección vive en
> [`.planning/PROJECT.md`](../.planning/PROJECT.md) (tabla de Key Decisions) y las reglas que no
> se pueden violar están en [`CLAUDE.md`](../CLAUDE.md). Si este documento y aquellos se
> contradicen, mandan aquellos.
>
> **Cómo verlo.** Es Mermaid: renderiza solo en GitHub, en Notion (pegando el bloque de código),
> en el preview de Markdown de VS Code y en cualquier visor de Mermaid. No hace falta instalar nada.
>
> **Convención:** línea sólida = existe o está planificado en el milestone 1.
> Línea punteada y borde gris = v2 o posterior, dibujado para que se vea hacia dónde crece.

---

## Nivel 1 — Contexto

Quién usa Sinápsis y con qué sistemas externos habla.

```mermaid
flowchart TB
    visitante(["<b>Visitante</b><br/><i>Público, sin sesión</i>"])
    curador(["<b>Curador</b><br/><i>Dueño del sistema.<br/>Cura la data</i>"])
    artista(["<b>Creadxr</b><br/><i>Sube sus propias obras</i>"])

    sinapsis["<b>SINÁPSIS</b><br/><br/>Red social de creadxrs y obra colectiva.<br/>Cada artista, obra, serie, espacio y evento<br/>es un nodo; cada colaboración, un vínculo.<br/>Se explora como una red neuronal 3D."]

    youtube["<b>YouTube</b><br/><i>Reproductor embebido<br/>en la ficha de obra</i>"]
    oauth["<b>Google / Instagram</b><br/><i>OAuth 2.0</i>"]
    email["<b>Servicio de email</b><br/><i>Invitaciones y avisos<br/>de vínculo</i>"]

    visitante -->|"Explora la red,<br/>descubre artistas y obras"| sinapsis
    curador -->|"Importa el CSV curado,<br/>corrige la data"| sinapsis
    artista -.->|"Carga obras, propone vínculos"| sinapsis

    sinapsis -->|"Embebe video"| youtube
    sinapsis -.->|"Delega autenticación"| oauth
    sinapsis -.->|"Envía invitaciones"| email

    classDef persona fill:#578CCB,stroke:#2c5a8f,color:#fff
    classDef sistema fill:#9900FF,stroke:#6b00b3,color:#fff
    classDef externo fill:#8a8a8a,stroke:#5c5c5c,color:#fff
    classDef futuro fill:#3a3a3a,stroke:#7a7a7a,color:#c9c9c9,stroke-dasharray: 5 5

    class visitante,curador persona
    class sinapsis sistema
    class youtube externo
    class artista,oauth,email futuro
```

**Nota sobre tropicalponcho.art:** no es un sistema aparte. Es un dominio que apunta a la página
de perfil del nodo `ENTIDAD` Tropical Poncho. Que funcione sin código específico es la prueba de
que el modelo sirve para cualquier productora o centro cultural.

---

## Nivel 2 — Contenedores

Las piezas ejecutables y dónde vive cada responsabilidad.

```mermaid
flowchart TB
    visitante(["<b>Visitante</b>"])
    curador(["<b>Curador</b>"])

    subgraph navegador["🌐 NAVEGADOR"]
        direction TB
        ui["<b>UI React</b><br/><i>Next App Router</i><br/>Rutas como overlays flotantes.<br/>La Vista activa vive en la URL."]
        puente["<b>Puente</b><br/><i>1 archivo</i><br/>Lo único que importa<br/>React y el motor a la vez."]
        motor["<b>SinapsisEngine</b><br/><i>JS vanilla + three.js + 3d-force-graph</i><br/>Canvas 3D de fondo, permanente.<br/>Una sola instancia en toda la app."]
        grafo["<b>resolverVista + adyacencia</b><br/><i>función pura + Map</i><br/>BFS en memoria.<br/>Explorar no toca la red."]
    end

    subgraph servidor["☁️ SERVIDOR"]
        direction TB
        next["<b>Next.js</b><br/><i>Node</i><br/>SSR de las páginas de nodo<br/>+ el endpoint de topología."]
    end

    pg[("<b>Postgres</b><br/><i>Schema gobernado por<br/>migraciones SQL del repo</i><br/>nodos · vinculos · subtipos · metadata jsonb")]

    carga["<b>Pipeline de carga</b><br/><i>scripts Node, corrida manual</i><br/>dump Mongo → CSV → planilla → import"]

    visitante -->|"HTTPS"| ui
    curador -->|"Corre los scripts"| carga

    ui <-->|"setVista / eventos"| puente
    puente <--> motor
    ui -->|"Pide la Vista"| grafo
    grafo -->|"Subgrafo"| motor

    ui -->|"GET /api/topologia<br/><i>una vez, al arrancar</i>"| next
    next -->|"Topología completa"| grafo
    ui -->|"GET metadata del nodo<br/><i>al abrir una ficha</i>"| next

    next -->|"2 SELECT sin joins"| pg
    carga -->|"INSERT"| pg

    classDef persona fill:#578CCB,stroke:#2c5a8f,color:#fff
    classDef contenedor fill:#9900FF,stroke:#6b00b3,color:#fff
    classDef datos fill:#FF0074,stroke:#b30052,color:#fff
    classDef script fill:#FFBC00,stroke:#b38400,color:#222

    class visitante,curador persona
    class ui,puente,motor,grafo,next contenedor
    class pg datos
    class carga script
```

### Por qué el reparto es este

| Responsabilidad | Dónde | Motivo |
|---|---|---|
| Recorrer el grafo | Navegador | La topología es idéntica para todos y a escala v1 son ~225KB. Explorar queda instantáneo, sin ida y vuelta por salto. |
| Guardar el grafo | Postgres | Constraints reales, `jsonb` anidado para la ficha técnica, y full-text y geo nativos para v2. |
| Decidir qué se publica | Servidor | En v2 los vínculos `PENDIENTE` no son públicos. Ese filtro nunca puede ser del cliente. |
| Renderizar | Navegador | Es el techo real del sistema: cada nodo es hoy un draw call. |

**Postgres nunca recorre el grafo.** Hace dos scans secuenciales para dumpear la topología y nada
más. El recorrido es un BFS sobre un `Map`. Por eso ninguna base de grafos aportaba: esa parte no
la hace una base.

---

## Nivel 3a — Componentes del navegador

El detalle de la pieza con más sustancia. `src/engine/` viene portado desde
`collectiveConscience`, donde ya corría en producción.

```mermaid
flowchart TB
    subgraph react["UI React — src/app/"]
        layout["<b>Layout raíz</b><br/>Monta el canvas UNA vez,<br/>por encima del router."]
        rutas["<b>Rutas</b><br/>home · /entidad/[id] · /obra/[id]<br/>Overlays con scrim."]
        menu["<b>Menú</b><br/>Se renderiza de la misma data<br/>que alimenta al grafo."]
    end

    puente["<b>Puente React ↔ motor</b><br/>setVista(vista, transicion) · on(evento)<br/>Área segura hacia adentro,<br/>posición en pantalla hacia afuera."]

    subgraph engine["SinapsisEngine — src/engine/"]
        direction TB
        objman["<b>ThreeObjectManager</b><br/>Registro por tipo vía barrel explícito.<br/>Crea y libera objetos 3D."]
        objs["<b>ThreeObjects</b><br/>15 tipos con shaders GLSL propios.<br/>Params escalares por nodo."]
        camara["<b>CameraController</b><br/>Encuadra el nodo dentro<br/>del área segura."]
        anim["<b>AnimationManager</b><br/>reemplazo · filtrado · aditivo<br/>Animaciones esperables."]
        force["<b>3d-force-graph</b><br/><i>librería</i><br/>Layout de fuerzas y picking."]
    end

    subgraph datos["Grafo en memoria"]
        adyacencia["<b>Índice de adyacencia</b><br/>Map&lt;nodeId, aristas[]&gt;<br/>Se arma una vez al recibir el dump."]
        resolver["<b>resolverVista()</b><br/><i>función pura, sin framework</i><br/>BFS con profundidad, tipos, roles,<br/>dirección, atributos, límite."]
    end

    contrato["<b>src/types/vista.ts</b><br/><i>contrato compartido</i>"]

    layout --> puente
    rutas -->|"Cambio de ruta =<br/>Vista + cámara + overlay,<br/>secuenciados"| puente
    rutas --> resolver
    resolver --> adyacencia
    resolver -->|"Subgrafo"| puente
    puente --> objman
    puente --> camara
    puente --> anim
    objman --> objs
    anim --> objman
    anim --> camara
    objman --> force
    menu -.->|"lee"| resolver

    contrato -.->|"tipa"| resolver
    contrato -.->|"tipa"| puente

    classDef reactc fill:#578CCB,stroke:#2c5a8f,color:#fff
    classDef enginec fill:#9900FF,stroke:#6b00b3,color:#fff
    classDef datac fill:#8AE2C8,stroke:#4a9e85,color:#222
    classDef puentec fill:#FFBC00,stroke:#b38400,color:#222
    classDef contratoc fill:#FF0074,stroke:#b30052,color:#fff

    class layout,rutas,menu reactc
    class objman,objs,camara,anim,force enginec
    class adyacencia,resolver datac
    class puente puentec
    class contrato contratoc
```

**La regla que sostiene este diagrama:** el motor no importa React y React no importa THREE. El
puente es el único archivo que ve a los dos. Ya se intentó al revés, con `react-force-graph-3d`,
en la rama `task/Refactor-en-React` de este repo, y falló.

---

## Nivel 3b — Componentes del servidor

Chico a propósito. El servidor casi no piensa.

```mermaid
flowchart TB
    subgraph next["Next.js"]
        topologia["<b>GET /api/topologia</b><br/>2 SELECT sin joins.<br/>Decide qué entra en el dump."]
        nodo["<b>GET /api/nodo/[id]</b><br/>metadata jsonb + descripción<br/>de vínculos. Solo al abrir una ficha."]
        ssr["<b>SSR de páginas de nodo</b><br/>Para que un portfolio<br/>sea indexable."]
        db["<b>Acceso a datos</b><br/>SQL plano."]
    end

    pg[("<b>Postgres</b>")]

    subgraph tablas["Schema — migraciones SQL del repo"]
        nodos["<b>nodos</b><br/>columnas livianas + metadata jsonb<br/>id · node_type · subtipo · label · descripcion_breve<br/>thumb · viz_params · fecha · disciplina"]
        vinculos["<b>vinculos</b><br/>origen · destino (FK reales)<br/>tipo_vinculo (enum) · rol · descripcion · created_by"]
    end

    topologia --> db
    nodo --> db
    ssr --> db
    db --> pg
    pg --- nodos
    pg --- vinculos

    classDef api fill:#9900FF,stroke:#6b00b3,color:#fff
    classDef datos fill:#FF0074,stroke:#b30052,color:#fff
    classDef tabla fill:#8AE2C8,stroke:#4a9e85,color:#222

    class topologia,nodo,ssr,db api
    class pg datos
    class nodos,vinculos tabla
```

### El tipado de vínculos, en tres niveles

Cada nivel vive en un lugar distinto según lo que pese:

1. **`tipo_vinculo`** — estructural, define cómo se recorre. Es lo que filtra la Vista. Va en el dump.
2. **`rol`** — semántico y filtrable: "director de arte", "dj"; y en `INSPIRO`, "cita directa" o "homenaje". Vocabulario distinto por tipo, mismo campo. Va en el dump.
3. **`descripcion`** — prosa para leer, no consultable. **No** va en el dump: se pide al abrir el vínculo.

---

## Flujo: qué pasa cuando alguien entra y toca un nodo

```mermaid
sequenceDiagram
    participant V as Visitante
    participant R as UI React
    participant T as resolverVista
    participant M as SinapsisEngine
    participant S as Next.js
    participant P as Postgres

    V->>R: Entra al sitio
    R->>S: GET /api/topologia
    S->>P: 2 SELECT sin joins
    P-->>S: nodos + vinculos
    S-->>R: Topología (~225KB)
    R->>T: Construye el índice de adyacencia
    R->>T: resolverVista({raiz: null, ...})
    T-->>R: Subgrafo
    R->>M: setVista(subgrafo, {transicion: 'reemplazo'})
    M-->>V: Red 3D en pantalla

    Note over V,P: A partir de acá, explorar no toca la red

    V->>M: Toca un nodo
    M-->>R: on('nodeFocus', {nodo, región en pantalla})
    R->>R: Cambia la URL a /obra/[id]
    R->>T: resolverVista({raiz: id, profundidad: 1, ...})
    T-->>R: Subgrafo (sin red)
    R->>M: setVista(..., {transicion: 'filtrado'}) + área segura
    M-->>V: Cámara vuela al nodo
    R->>S: GET /api/nodo/[id]
    S->>P: SELECT metadata
    P-->>R: Ficha técnica
    R-->>V: Overlay con scrim del lado opuesto
```

Lo importante del diagrama: **una sola llamada de red al arrancar**, y después una por ficha que
se abre. Recorrer la red —seguir vínculos, cambiar filtros, entrar y salir de sub-redes— no
dispara nada.

---

## Hacia dónde crece

| Cuándo | Qué cambia en estos diagramas |
|---|---|
| La topología deja de entrar en el navegador (~20-50k nodos) | `resolverVista` se muda al servidor. No se reescribe: es una función pura sin dependencias, por eso corre en los dos lados. El navegador pasa a pedir subgrafos en vez de la topología entera. |
| Auth (v2) | Entra un contenedor de sesión y el endpoint de topología empieza a filtrar por `estado` del vínculo. |
| Lxs creadxrs cargan sus obras (v2) | Entra una UI de carga en la app. Nunca un panel de CMS: el schema es del repo. |
| El render toca su techo (ver PERF-01) | `ThreeObjectManager` gana una segunda implementación con `InstancedMesh`. Los nodos cercanos siguen siendo meshes individuales; el resto va instanciado. Por eso `viz_params` guarda escalares y nunca GLSL. |

---

## Cómo mantener esto

Este archivo se actualiza cuando cambia la **estructura**, no cuando cambia una decisión. Si lo
que cambió fue el *por qué*, va en `.planning/PROJECT.md`. Si cambió una regla que no se puede
violar, va en `CLAUDE.md`.

Si algún día los cuatro niveles empiezan a contradecirse entre sí —el síntoma clásico de mantener
diagramas a mano— el paso siguiente es Structurizr DSL o LikeC4: se modela una vez y las vistas se
derivan. Hoy sería overkill, y un diagrama que necesita Docker para mirarse es un diagrama que no
se actualiza.

---

*Última actualización: 2026-08-06*
