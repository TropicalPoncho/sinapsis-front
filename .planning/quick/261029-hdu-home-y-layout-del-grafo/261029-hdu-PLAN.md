---
quick_id: 261029-hdu
type: execute
autonomous: true
---
# Home solo colectivas + layout sano del grafo

Pedido del dueño (2026-10-29): el home tiene "un bardo de neuronas" y el layout queda colapsado/pegoteado ("impresentable", lo más importante).

## Tarea 1 — Home: solo entidades colectivas
Home = ENTIDAD colectivas (productora, sello, espacio/centro_cultural y afines; verificá los subtipos reales en data/curaduria/nodos.csv) + las AGRUPACION/áreas que ya corresponden. Sin personas, dúos de personas, ni integrantes/ex-integrantes de Tropical. Regla de la Vista del home (resolverVista/url.ts, pura), criterio en un único lugar, fácil de cambiar; `ponytail:` con techo (hoy fijo, el dueño quiere que cada unx configure qué mostrar) y salida. Sin tocar el modelo de datos. Tests al día.

## Tarea 2 — Layout
Parámetros hoy: src/lib/red/fuerzas.ts (charge -8, linkDistance 140, linkDistanciaPorGrado 0.4), SinapsisEngine._distanciaPorGrado, sembrarJuntoAVecinos, warmupTicks 300, escala visual de nodos. Investigá la causa real del colapso con la red real: ¿distancia por tipo de vínculo, siembra, tamaño de nodos? Medí ANTES con una métrica objetiva (distancia mínima entre pares / radio, y captura) en el home y en subredes (Tropical, Rama); después volvé a defaults sanos de force-graph y, si hace falta para que no queden pegados, bajá el tamaño de nodos y/o subí la repulsión. Medí DESPUÉS y reportá antes/después. Perillas por URL ?dist= ?grado= ?charge= ?escala= sirven para experimentar. Actualizá la memoria layout-distances-retune (carpeta de memoria del proyecto) con el resultado.

## Reglas
- Playwright/gstack headless contra tu propio `next dev` en 3003 desde copia aislada con TOPOLOGIA_FIXTURE; NO uses el servidor del dueño (3000).
- Invariantes de CLAUDE.md: motor sin React, un canvas, viz_params escalares; no tocar fixes G-06 (texturas 512px, montaña liviana en táctiles).
- Nunca leas .env*, nunca toques Neon ni bases reales. `npm test`, `tsc`, lint en verde. Commits atómicos con trailer Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>.
- Escribí SUMMARY en el task_dir al terminar.
