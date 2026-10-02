---
phase: 02-data-vista-backend
plan: 05
subsystem: data
tags: [migracion, curaduria, postgres]
requires: [02-03, 02-04]
provides: [red-real-en-postgres]
affects: [05]
key-files:
  modified: [scripts/migracion/importar.ts, data/curaduria/nodos.csv, data/curaduria/vinculos.csv]
key-decisions:
  - "El plan original asumía node_type en {ARTISTA,OBRA,SERIE,ESPACIO,EVENTO,STUB} y tipo_vinculo en {COMPONE,COLABORO_EN,CORREALIZO,PRODUJO,INTEGRA,INSPIRO,REGISTRO} — ninguno de los dos enums sobrevivió. El dueño decidió, en los meses entre la escritura del plan y su cierre, el modelo real documentado hoy en CLAUDE.md: node_type = {ENTIDAD,OBRA,EVENTO,AGRUPACION} (4 valores fijos, subtipo abierto en tabla aparte) y tipo_vinculo = {COMPONE,COLABORO_EN,PRODUJO,INTEGRA,PRECEDE,SUCEDE_EN} (6 valores, sin CUSTOM, el matiz va en rol)."
  - "La curaduría de tipos (Task 2, el checkpoint humano) no fue una sola pasada: fue incremental a lo largo de muchas sesiones — incluida esta, donde se agregó el roster de colaboradores de ~13 eventos reales desde las planillas de producción en Dropbox (Data.xlsx por evento)."
  - "viz_params.shape no es una tabla fija 1:1 por node_type como describía el plan: cada node_type tiene un pool de formas válidas y `shapeVariado(nodeType, id)` elige una determinística por hash del id — es lo que da variedad visual dentro de un mismo tipo."
requirements-completed: [DATA-03, DATA-06, DATA-07, DATA-08]
duration: multi-sesión (incremental)
completed: 2026-10-01
---

# Phase 2 Plan 05: Curaduría de tipos y segunda pasada Summary

Cierre formal de la migración Mongo → Postgres. El pipeline (`scripts/migracion/importar.ts`) corre de punta a punta sobre los CSV curados a mano, y la red real sale completa por `/api/topologia`.

## Tasks

1. **Segunda pasada de importación** — ya existía y funciona: lee `nodos.csv`/`vinculos.csv` vía `leerCsv`, valida todo antes de escribir (node_type, label, fecha, tipo_vinculo, rol, ids duplicados, `origen === destino`), y carga en una sola transacción (`TRUNCATE` + `INSERT` parametrizado, nunca interpolado). `viz_params.shape`/`color` se asignan por pool determinístico (no 1:1 fijo como decía el plan original), con `speed` uniforme (0.05), `noise` variado y `seed` por hash FNV-1a del id — nunca `Math.random()`.
2. **Curaduría de tipos en la planilla** — el checkpoint humano del plan, resuelto de forma incremental y no en una sola sesión: el dueño fue decidiendo `node_type`/`tipo_vinculo`/`subtipo` a lo largo de meses, y esta sesión sumó específicamente el roster de colaboradores (`COLABORO_EN` con `rol`) de 13 eventos reales (NUDO, Punk Solar, ESPORA, Tropical Posporno: Distopia, SOMA Beta, Anomalia, C.E.P.A., Tempistica I y II, Tropical Posporno 2022, Kutral parcial) leyendo las planillas `Data.xlsx` de producción en Dropbox y cruzando apodos contra las entidades ya curadas.
3. **Carga final y verificación end to end** — corrida y verificada contra la base real (ver Verification abajo).

## Deviations from Plan

El documento `02-05-PLAN.md` quedó desactualizado respecto al modelo real de datos — ver `key-decisions` arriba. No se reescribió el plan en sí (es un artefacto histórico de cuándo se escribió, antes de que el dueño fijara el modelo de 4 tipos de nodo); este summary documenta el estado real en su lugar. Las acceptance criteria literales del plan (enums de 6/7 valores, "ESPACIO" para Tropical Poncho, 35–60 nodos) no aplican tal cual; se verificó el *objetivo* del plan (migración repetible, tipos curados a mano, sin categorías institucionales, `viz_params` escalar, data profunda en `metadata`, topología limpia) contra el modelo real.

## Verification

- `npm run migracion:importar` corrido dos veces seguidas: 176 nodos / 246 vínculos ambas veces (idempotente).
- `node_type` real en la base: ENTIDAD 153, EVENTO 13, AGRUPACION 6, OBRA 4.
- `tipo_vinculo` real: COLABORO_EN 181, INTEGRA 21, PRODUJO 16, COMPONE 16, PRECEDE 11, SUCEDE_EN 1 — sin CUSTOM.
- `Tropical Poncho` existe, `ENTIDAD`/`productora`, sin descartar.
- 0 filas de categorías institucionales (Instagram, Stickers, LIVE SETs, etc.) sobrevivieron.
- 0 `descripcion_breve` de más de 200 caracteres.
- 0 vínculos con `origen` huérfano (FK intacta).
- 0 nodos con `viz_params->>'seed'` nulo; 160 seeds distintas sobre 176 nodos.
- `/api/topologia`: 176 ocurrencias de `"nodeType"`, 0 de `"metadata"`, solo `"descripcionBreve"` (nunca `"descripcion"` a secas), `vizParams` con `seed/color/noise/shape/speed` escalares en toda fila muestreada.
- `npm test` 114/114, `npx tsc --noEmit` limpio, `npm run build` limpio (solo warnings de lint preexistentes, no de este plan).

## Known Stubs

- Varios nodos nuevos de esta sesión (colaboradores de eventos) son stubs mínimos: solo `label` + `descripcion_breve` corta, sin `thumb`/`fecha`/`disciplina`. Es el patrón esperado para data "en lo que se sabe hoy" — no bloquea nada.
- Kutral (2021) quedó con curaduría parcial: solo el colectivo "Todo Tet" cargado. El roster completo vive en una hoja de Google Sheets fuera del alcance del conector de Dropbox; pendiente de que el dueño pase el link o los nombres.
- Los CSV corregidos están en working tree sin commitear — no se commiteó por cuenta propia, a la espera de confirmación explícita del dueño.

## Self-Check: PASSED
