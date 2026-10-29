---
quick_id: 261029-hui
type: quick
status: complete
plan_head_before: bc07c95ed0c2f7c334fed0528e61e1f87c572cbd
plan_head_after: d323bf41a71d484c2abd53315bb1ec0010bce9bb
commits: 2   # medido: git rev-list --count plan_head_before..plan_head_after (el commit docs de este SUMMARY va aparte)
actuals:
  tasks: 8
  commits: 2
key-files:
  modified:
    - src/lib/red/menus.ts
    - src/lib/red/botones.ts
    - src/lib/red/roles.json
    - src/app/Overlay.tsx
    - src/app/Menus.tsx
    - src/app/Ficha.tsx
    - src/app/Shell.tsx
    - src/app/BranchedMenu.jsx
    - src/app/BranchedMenu.css
    - src/styles/overlay.css
    - data/curaduria/nodos.csv
  tests:
    - src/lib/red/menus.test.ts
    - src/lib/red/botones.test.ts
    - src/lib/red/neuronas.test.ts
---

# Quick 261029-hui: listas (orden + Próximos/Pasados), Volver abajo, Expandir vs Entrar

## Decisiones que afectan el futuro (primero)

1. **Toda lista de nodos va del más reciente al más viejo, para cualquier dueño (`porReciente`, `menus.ts`).** Se enmienda D-47: antes las ediciones PRECEDE y las listas por rol de obras/eventos se leían cronológico (`porFecha`). Nota de D-47 actualizada en `04.1-CONTEXT.md`. `porFecha` queda solo para ordenar los próximos (el más cercano antes) y para `obrasDe`.
   - *Riesgo:* una serie de ediciones ("Tempistica I, II") ya no se lee en el orden en que pasaron. Es lo que pidió el dueño; si molesta en una serie concreta, la salida es un orden por tipo de lista, no volver al global.
2. **Una ENTIDAD con filas de portfolio ofrece Expandir aunque no tenga About.** La regla vive en un solo lugar, `botonesDe` (`botones.ts:17`): `(n.ficha || secciones > 0)` para OBRA, EVENTO y ENTIDAD (antes ENTIDAD solo con `ficha`). El flag `ficha` de `/api/topologia` no cambió (sigue diciendo "hay contenido", no "se puede expandir"). Efecto lateral a confirmar: **toda persona con portfolio expande ahora** (antes solo las que tenían ficha cargada). Un stub nunca expande.
3. **"Ocultar secciones del portfolio de un nodo" es config por id de nodo en `roles.json` (`portfolios[].ocultar`).** Hoy: Tropical Poncho (`6335d5fa7636ed5b3529c545`) sin "Integrantes" ni "Ex integrantes". Las filas no pasan a otra sección: simplemente no se muestran; los vínculos INTEGRA siguen en el grafo, en la base y en el portfolio de cada persona. Club Weyba, In Session y Post.xno no cambian (test). `ponytail:` en `menus.ts`, techo: fijo por id de nodo; salida: una preferencia por entidad servida con la topología (M2), sin tocar la firma de `seccionesDe`.
   - *Riesgo:* el id es el de Mongo/CSV. Si la entidad se re-crea con otro id en la base, la regla deja de aplicar en silencio (el test lo ata contra los CSV, no contra Neon).

## Qué cambió, por punto

| # | Punto | Cambio | Dónde |
|---|-------|--------|-------|
| 1 | Orden | `entre` (porFecha / porReciente según dueño) reemplazado por `porReciente` siempre; `nodosDeLaRed` también ordena reciente. Tests: nuevos para el orden de `nodosDeLaRed`, de un dueño OBRA y de `ocultar`. | `menus.ts` |
| 2 | Próximos / Pasados | Lista lateral: `nodosDeLaRed(sub, redId, hoy)` pone los eventos de hoy en adelante primero y los marca `proximo`; `itemsDe` marca los `proximos` de una sección; `MenuLateral` inserta los subtítulos "Próximos" (acento) y "Pasados" solo si hay próximos. BranchedMenu: item `{ titulo }` (segundo cambio propio al componente, anotado en su cabecera). Ficha: "Próximos" (punto y acento) y "Pasados" (apagado, 12 px), clase `expandido__sub`. Se sacó el prefijo "Próximo · ". Sin fecha va a Pasados, al final. | `Overlay.tsx`, `Menus.tsx`, `BranchedMenu.*`, `Ficha.tsx`, `overlay.css` |
| 3 | Volver abajo | `MenuLateral`: VOLVER es el último hijo del nav. La lista scrollea en su propio contenedor (`.lateral__lista`) y el nav ya no scrollea: con una lista larga VOLVER queda siempre a la vista debajo de ella (con scroll del nav entero quedaba fuera de pantalla: medido `volverTop` 855 en 800 px de alto, ahora 756). Panel y ficha: ya estaban al final del panel / en la cabecera de la ficha; no se tocaron. | `Menus.tsx`, `overlay.css` |
| 4 | Sacar "Sumar sus obras" | Sale la acción `sumar`, `obrasPorSumar`, `porSumar` y el prop/función `sumar` de Shell. **Queda:** `LIMITE_SUMA`, `sumarIds`, el estado `sumados` y `subgrafoDe` (los usa el recorrido aditivo, D-22: créditos y nodos enfocados). `obrasDe` queda **sin uso en la app**: solo lo usan `neuronas.test.ts`/`url.test.ts` como oráculo; se deja y se borra en un cambio aparte si se quiere (reescribe esos tests). | `botones.ts`, `Overlay.tsx`, `Shell.tsx` |
| 5 | Expandir para ENTIDAD con portfolio | Ver decisión 2. La ficha de una ENTIDAD sin `ficha` y sin bloques muestra solo el Portfolio, alineado con la columna de texto (sin columna izquierda vacía: `soloPortfolio`, `expandido__creditos--solo`). Test: Sello Rojo (portfolio y sin About) = `[Expandir, Entrar]`. | `botones.ts`, `Ficha.tsx`, `overlay.css` |
| 6 | Expandir ≠ Entrar | `accion--entrar`: llena con el acento `#FF0080`, texto en negrita, flecha. `accion--expandir`: fondo transparente, borde blanco más marcado, ícono de despliegue (`UnfoldMore`). Íconos de `@hugeicons` (ya instalado). Medido en el DOM: Entrar `rgb(255,0,128)` lleno, Expandir `rgba(0,0,0,0)` con borde `rgba(255,255,255,.7)`. | `Overlay.tsx`, `overlay.css` |
| 7 | Descripción de Tropical | `descripcion_breve` de Tropical Poncho en `nodos.csv` (197 caracteres, tope 200 del import). `ref_sub` (la referencia a la fuente vieja) no se tocó. **No está en Neon**: hace falta re-importar para que aparezca en la base viva (no se tocó Neon). | `data/curaduria/nodos.csv` |
| 8 | Tropical sin Integrantes | Ver decisión 3. | `roles.json`, `menus.ts` |

## Evidencia

Todas desde un `next dev -p 3003` aislado (copia de `src/` en el scratchpad con `node_modules` y `public` por junction, `TOPOLOGIA_FIXTURE=1`, fixture reemplazado SOLO en la copia por la red de los CSV con `ficha`/`horario` y `detalles.json` desde `fichas.json`: `herramientas/build-fixture.mts`). 1280x800 y 390x844 (táctil), Chromium headless, `capturas/` en esta carpeta, datos crudos en `capturas/resultados.jsonl`, script `herramientas/capturar.mjs`. Fecha del sistema 2026-10-29, así que el único próximo es Alterego (2026-10-31).

**Volver abajo** (`/entidad/obras`, lista lateral de Obras de Tropical, 17 eventos): `volverEsUltimo: true` en las dos resoluciones (VOLVER es `lastElementChild` del nav). Desktop: `volverTop` 756 > fin de la lista visible, dentro de los 800 px. Mobile (cajón abierto con la hamburguesa): `volverTop` 785 en 844 px. Capturas: `desktop-1-lista-obras-volver-abajo.png`, `mobile-1-lista-obras-volver-abajo.png`. (En las capturas el indicador "N" de Next, solo en dev, tapa un pedazo del texto de VOLVER.)

**Próximos / Pasados**:
- Lista lateral de Obras, orden medido: `[Próximos] Alterego · [Pasados] Luca Zisa en Ave Fenix, Entropía, Anomalia, Punk Estelar, Punk Solar, ESPORA, Tropical Posporno: Distopia, Concierto Público #4, C.E.P.A., NUDO, SOMA, SOMA beta, Tropical Posporno, Tempistica II, Tempistica I, Kutral` (reciente a viejo). Mismo resultado en desktop y mobile.
- Ficha de Rama, Participaciones: subtítulos `["Próximos", "Pasados"]`, Alterego bajo Próximos y el resto bajo Pasados; Obras y Organizaciones (sin próximos) sin subtítulos, lista plana. Ficha de Tropical, Eventos producidos: igual. Capturas: `desktop-5-ficha-rama-proximos-pasados.png`, `mobile-5-…`, `desktop-6b-ficha-tropical-sin-integrantes.png`.

**Expandir vs Entrar**: `desktop-2-panel-expandir-vs-entrar.png`, `mobile-2-…` (en mobile los dos botones ocupan el ancho: uno con borde y fondo vacío, otro lleno rosa).

**Sello Rojo**: panel con `[Expandir, Entrar a Sello Rojo]`; ficha con `columnas: 0`, solo Portfolio (Eventos producidos: Entropía; Integrantes: Juan Balladobres). `desktop-3/4`, `mobile-3/4`.

**Tropical**: grupos de la ficha `["Eventos producidos", "Participaciones"]` (sin Integrantes ni Ex integrantes); descripción breve nueva visible en la ficha. `desktop-6a/6b`, `mobile-6a/6b`.

## Gates

| gate | resultado |
|------|-----------|
| `npm test` | 248/248 (eran 244: +4 en `menus.test.ts`; `botones.test.ts` y `neuronas.test.ts` reescritos donde pinneaban Sumar / Integrantes de Tropical) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0, sin warnings nuevos (los previos: `src/engine/threeObjects/*` y `<img>` en `Ficha.tsx`) |
| Invariantes | motor sin React, un canvas, `viz_params` escalares, sin cambios al modelo de datos ni a la URL; la sección abierta sigue sin vivir en la URL |

No se corrió `next build`. Neon y el 3000 del dueño no se tocaron; no se leyó ningún `.env*`. El 3003 quedó cerrado y la copia sin junctions.

## Deviations from Plan

**1. [Rule 1 - Bug] Con la lista larga VOLVER quedaba fuera de pantalla.** Al mover VOLVER al final del nav (que scrolleaba entero) quedaba a 855 px en 800 de alto. Se hizo scrollear solo la lista (`.lateral__lista`). Mismo commit.

**2. [Alcance] Mover "Volver" de la cabecera de la ficha.** No se tocó: es el botón de cierre de la capa, no una lista (el plan habla de la lista lateral "y donde exista"). Decisión del dueño si también lo quiere abajo.

**3. [Alcance] Commits.** Dos en vez de uno por punto: los puntos 1 a 6 y 8 comparten archivos (Overlay, menus, overlay.css) y no se podían separar sin `add -p`. El punto 7 (dato) va aparte.

## Known Stubs

Ninguno.

## Threat Flags

Ninguno: sin endpoints, auth ni esquema nuevos. `ocultar` es un filtro de presentación sobre contenido ya público; los vínculos siguen viajando en la topología.

## Pendiente para el dueño

- Confirmar que toda persona con portfolio expanda (decisión 2).
- Re-importar la base para que la descripción de Tropical llegue a Neon (`npm run migracion:importar`, lo corre el dueño).
- Si quiere Volver al final también en la ficha (hoy en la cabecera).
- Tintero (no construido): flyer por evento y galería de próximos eventos; qué ve cada unx (preferencia por entidad, reemplaza `ocultar`).

## Self-Check: PASSED

- Commits `06c0437` y `d323bf4` presentes (`git log`); `commits: 2` medido contra `plan_head_before` `bc07c95`.
- `capturas/` con 14 PNG y `resultados.jsonl`, `herramientas/` con `build-fixture.mts` y `capturar.mjs`.
- 3003 sin listeners; `node_modules` y `public` del repo intactos.
