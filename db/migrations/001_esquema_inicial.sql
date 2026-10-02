-- 001_esquema_inicial.sql — modelo Nodo/Vínculo de la ERS.
--
-- No existe dimensionId, ni nivel, ni profundidad persistida (VIST-06). La distancia a la raíz
-- es una propiedad del traversal de una Vista concreta, no del nodo. Si alguna vez aparece una
-- columna así, el modelo volvió al problema que esta fase existe para borrar.

-- DATA-03: viz_params guarda escalares. Un CHECK no admite subconsultas, así que la regla vive
-- en una función IMMUTABLE. Sin objetos, sin arrays y sin strings de más de 32 caracteres — los
-- valores legítimos (nombre de shape, color hex) no llegan ni cerca; un fragmento de GLSL no
-- entra por ninguna de las tres puertas.
CREATE OR REPLACE FUNCTION viz_params_escalares(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_typeof(p) = 'object'
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_each(p) AS e
       WHERE jsonb_typeof(e.value) IN ('object', 'array')
          OR (jsonb_typeof(e.value) = 'string' AND length(e.value #>> '{}') > 32)
     );
$$;

-- Vocabulario abierto de subtipos. `node_type` es lo ESTRUCTURAL —cómo se recorre el nodo—
-- y `subtipo` es el nombre de la cosa: banda, dúo, colectivo, productora, centro cultural.
-- Es el mismo patrón de dos niveles que tipo_vinculo + rol.
--
-- Tabla y no CHECK, porque es un campo filtrable: en texto libre, "banda" / "Banda" / "bandas"
-- fragmentan el filtro en silencio. Sumar un subtipo es un INSERT, no una migración.
CREATE TABLE subtipos (
  codigo    text PRIMARY KEY,
  node_type text NOT NULL,
  label     text NOT NULL,

  CONSTRAINT subtipos_node_type_valido CHECK (
    node_type IN ('ENTIDAD', 'OBRA', 'EVENTO', 'AGRUPACION'))
);

INSERT INTO subtipos (codigo, node_type, label) VALUES
  ('persona',         'ENTIDAD',    'Persona'),
  ('duo',             'ENTIDAD',    'Dúo'),
  ('banda',           'ENTIDAD',    'Banda'),
  ('colectivo',       'ENTIDAD',    'Colectivo'),
  ('productora',      'ENTIDAD',    'Productora'),
  ('centro_cultural', 'ENTIDAD',    'Centro cultural'),
  ('sello',           'ENTIDAD',    'Sello'),
  ('proyecto',        'ENTIDAD',    'Proyecto'),
  ('plataforma',      'ENTIDAD',    'Plataforma'),
  -- Genérico: la obra existe pero todavía no se decidió de qué tipo es. Mejor un valor
  -- honesto que forzar una categoría inventada en la migración.
  ('obra',            'OBRA',       'Obra'),
  ('pintura',         'OBRA',       'Pintura'),
  ('video',           'OBRA',       'Video'),
  ('libro',           'OBRA',       'Libro'),
  ('cancion',         'OBRA',       'Canción'),
  ('disco',           'OBRA',       'Disco'),
  ('episodio',        'OBRA',       'Episodio'),
  ('instalacion',     'OBRA',       'Instalación'),
  ('concierto',       'EVENTO',     'Concierto'),
  ('muestra',         'EVENTO',     'Muestra'),
  ('funcion',         'EVENTO',     'Función'),
  ('conversatorio',   'EVENTO',     'Conversatorio'),
  ('festival',        'EVENTO',     'Festival'),
  ('fiesta',          'EVENTO',     'Fiesta'),
  ('jam',             'EVENTO',     'Jam'),
  ('performance',     'EVENTO',     'Performance'),
  ('serie',           'AGRUPACION', 'Serie'),
  ('area',            'AGRUPACION', 'Área'),
  ('podcast',         'AGRUPACION', 'Podcast'),
  ('ciclo',           'AGRUPACION', 'Ciclo'),
  ('coleccion',       'AGRUPACION', 'Colección');

CREATE TABLE nodos (
  id                text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  node_type         text        NOT NULL,
  subtipo           text        NOT NULL REFERENCES subtipos(codigo),
  label             text        NOT NULL,
  descripcion_breve text,
  thumb             text,
  viz_params        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_stub           boolean     NOT NULL DEFAULT false,
  fecha             timestamptz,
  disciplina        text,
  location_id       text,
  -- DATA-02: la data profunda (bio, links, ficha técnica). La consulta de topología nunca la trae.
  metadata          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Auditoría y base de la autorización. Nullable y sin FK: `usuarios` llega con auth en el
  -- milestone 2. Se agrega ahora porque después habría que decidir a quién se le atribuyen
  -- las filas ya cargadas; el import lo completa en el momento en que la respuesta se sabe.
  created_by        text,

  -- Cuatro tipos y solo cuatro. No existe ESPACIO (lo distinguía tener lugar físico, y
  -- location_id ya es columna de todo nodo) ni STUB (es un estado, y está en is_stub).
  CONSTRAINT nodos_node_type_valido CHECK (
    node_type IN ('ENTIDAD', 'OBRA', 'EVENTO', 'AGRUPACION')),
  CONSTRAINT nodos_label_no_vacio CHECK (length(btrim(label)) > 0),
  -- DATA-08: el tope de 200 no es estilo, es lo que mantiene enviable el dump de topología.
  CONSTRAINT nodos_descripcion_breve_200 CHECK (
    descripcion_breve IS NULL OR length(descripcion_breve) <= 200),
  CONSTRAINT nodos_viz_params_escalares CHECK (viz_params_escalares(viz_params))
);

CREATE TABLE vinculos (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  origen       text NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
  destino      text NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
  tipo_vinculo text NOT NULL,
  -- rol: corto y filtrable, viaja en la topología. Es el escape hatch que reemplaza a CUSTOM.
  rol          text,
  -- descripcion: prosa para leer, NO filtrable. NO viaja en la topología (DATA-04).
  descripcion  text,
  -- Mismo criterio que en nodos: auditoría ahora, FK cuando exista `usuarios`.
  created_by   text,

  -- DATA-04: sin CUSTOM. Un tipo libre no se puede traversar ni filtrar desde una Vista.
  -- SUCEDE_EN en presente, como COMPONE/INTEGRA: el hecho estructural (dónde pasa el evento)
  -- no depende de si ya ocurrió — eso lo dice `fecha` en el nodo, no el tiempo verbal del vínculo.
  -- PRECEDE: dirigido, origen sucede antes que destino. Orden curatorial entre obras/eventos,
  -- no cronología de datos — dos obras del mismo año pueden tener un PRECEDE igual si así se
  -- decidió mostrarlas. INSPIRO ya cubre "esto inspiró a esto otro" cuando esa es la relación real.
  CONSTRAINT vinculos_tipo_valido CHECK (
    tipo_vinculo IN ('COMPONE', 'COLABORO_EN', 'CORREALIZO', 'PRODUJO',
                     'INTEGRA', 'INSPIRO', 'REGISTRO', 'SUCEDE_EN', 'PRECEDE')),
  CONSTRAINT vinculos_rol_corto CHECK (rol IS NULL OR length(rol) <= 60),
  CONSTRAINT vinculos_no_reflexivo CHECK (origen <> destino),
  CONSTRAINT vinculos_sin_duplicado UNIQUE NULLS NOT DISTINCT (origen, destino, tipo_vinculo, rol)
);

-- ponytail: sin índice en vinculos.origen/destino — nada consulta por ellos del lado del
-- servidor. El dump de topología son dos seq scans sobre ~250 filas y el traversal ocurre en el
-- cliente sobre un Map. Agregar btree en ambas el día que haya una consulta de traversal
-- server-side (el cruce declarado en PROJECT.md es ~20-50k nodos).

-- Autorización — NO se crea en v1, se documenta acá para que sea un lugar de aterrizaje
-- conocido. Llega con `usuarios` en el milestone 2:
--
--   permisos (usuario_id, nodo_id, claim, otorgado_por, creado_en,
--             PRIMARY KEY (usuario_id, nodo_id, claim))
--
-- Claims: 'editar' (cambiar campos) · 'vincular' (crear vínculos desde/hacia el nodo) ·
-- 'administrar' (lo anterior + otorgar permisos + borrar). Solo 'administrar' otorga claims.
--
-- Esta misma tabla contesta "qué entidades son mías": crear una entidad inserta
-- (yo, entidad, 'administrar'). No hace falta un usuario_entidad aparte.
--
-- Va separada de `vinculos` a propósito. Los vínculos son contenido público que viaja en el
-- dump; los permisos no pueden serlo. Y no coinciden: contratar a alguien para administrar una
-- productora es un permiso, no una colaboración artística — publicarlo como INTEGRA sería
-- afirmar algo falso. Y al revés, integrar públicamente un colectivo no implica poder editarlo.
--
-- Sobre los vínculos, la autoría ya está resuelta por el modelo: quien lo crea puede editarlo
-- y borrarlo; el destino puede aceptarlo o rechazarlo vía `estado`, pero no editarlo.
