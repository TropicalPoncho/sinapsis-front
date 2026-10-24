-- 002_vigencia_vinculos.sql — período de un vínculo (D-49, decisión del dueño 2026-10-24).
--
-- Agrega `desde` y `hasta` a `vinculos`: cuándo empezó y cuándo terminó la relación. Sin `hasta`, el
-- vínculo es vigente. Es un dato del vínculo y no del nodo: Laura Trotta integra Post.xno y ya no integra
-- Tropical Poncho. INTEGRA se sigue diciendo en presente (ver 001, SUCEDE_EN/COMPONE/INTEGRA); el período
-- es un dato más, no un cambio de tiempo verbal.
--
-- Tipo: texto con fecha parcial (AAAA | AAAA-MM | AAAA-MM-DD), no `date`. La precisión es un dato: el dueño
-- puede acordarse solo del año, y un `date` obligaría a inventar un día ("hasta 2023" no se distinguiría de
-- "hasta el 1 de enero de 2023"). Se compara en el cliente, donde ya ocurre el traversal; las fechas ISO
-- ordenan como cadenas una vez normalizadas. El patrón de forma es el mismo que FECHA_PARCIAL en
-- src/lib/red/fechas.ts (fechas.test.ts falla si se separan).
--
-- En la base es genérico: no hay CHECK por tipo_vinculo. Hoy solo INTEGRA lo lee, y el import lo acepta solo
-- en INTEGRA (importar.ts); el día que otro tipo lo necesite es código, no una migración.
--
-- Corre después de 001 con db/migrate.mjs: una vez y dentro de una transacción, sin IF NOT EXISTS, como 001.
-- Es aditiva (columnas nullable, sin default): el código desplegado hoy sigue andando con ella. El código que
-- viene con esta migración, en cambio, la NECESITA: /api/topologia selecciona `desde, hasta` y da 503 contra
-- una base sin ella. Correr esta migración en Neon ANTES de desplegar.

ALTER TABLE vinculos
  ADD COLUMN desde text,
  ADD COLUMN hasta text,
  -- ponytail: el CHECK valida la forma, no el calendario (2023-02-30 pasa). Lo frena vigenciaOk en el import y
  -- lo tiene que usar la UI de alta de M2. Salida: columnas generadas `date` el día que una consulta del
  -- servidor compare fechas.
  ADD CONSTRAINT vinculos_desde_fecha CHECK (
    desde IS NULL OR desde ~ '^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$'),
  ADD CONSTRAINT vinculos_hasta_fecha CHECK (
    hasta IS NULL OR hasta ~ '^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$'),
  -- `hasta` no puede ser anterior a `desde` en la precisión que comparten: ('2022-05' → '2022') vale,
  -- ('2022-05-10' → '2022-03') no. COLLATE "C" para que una colación que ignora la puntuación no cambie el
  -- resultado de la comparación.
  ADD CONSTRAINT vinculos_hasta_no_antes_de_desde CHECK (
    desde IS NULL OR hasta IS NULL OR
    substr(hasta, 1, least(length(desde), length(hasta))) COLLATE "C" >=
    substr(desde, 1, least(length(desde), length(hasta))) COLLATE "C");

-- ponytail: `vinculos_sin_duplicado` (origen, destino, tipo_vinculo, rol) no incluye el período, así que una
-- segunda membresía igual (alguien que se fue y volvió) choca. Salida: sumar `desde` a la unique en una
-- migración cuando aparezca el caso.

-- Sin índice sobre el período: nada consulta por fecha en el servidor (mismo criterio que el ponytail de 001
-- sobre origen/destino).
