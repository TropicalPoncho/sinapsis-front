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

CREATE TABLE nodos (
  id                text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  node_type         text        NOT NULL,
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

  CONSTRAINT nodos_node_type_valido CHECK (
    node_type IN ('ARTISTA', 'OBRA', 'SERIE', 'ESPACIO', 'EVENTO', 'STUB')),
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

  -- DATA-04: sin CUSTOM. Un tipo libre no se puede traversar ni filtrar desde una Vista.
  CONSTRAINT vinculos_tipo_valido CHECK (
    tipo_vinculo IN ('COMPONE', 'COLABORO_EN', 'CORREALIZO', 'PRODUJO',
                     'INTEGRA', 'INSPIRO', 'REGISTRO')),
  CONSTRAINT vinculos_rol_corto CHECK (rol IS NULL OR length(rol) <= 60),
  CONSTRAINT vinculos_no_reflexivo CHECK (origen <> destino),
  CONSTRAINT vinculos_sin_duplicado UNIQUE NULLS NOT DISTINCT (origen, destino, tipo_vinculo, rol)
);

-- ponytail: sin índice en vinculos.origen/destino — nada consulta por ellos del lado del
-- servidor. El dump de topología son dos seq scans sobre ~250 filas y el traversal ocurre en el
-- cliente sobre un Map. Agregar btree en ambas el día que haya una consulta de traversal
-- server-side (el cruce declarado en PROJECT.md es ~20-50k nodos).
