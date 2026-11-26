---
quick_id: 261126-prl
---
# Perlin liviano + base local al día

**Decisión:** el núcleo de la forma Perlin pasa de IcosahedronGeometry detalle 64 (heredado de `ThreeObject.segmentWidth`, 84.5k triángulos
por nodo con ruido 4D por vértice) a tope 16 (~5.8k), mismo patrón de tope que las demás formas (`perlinThreeObject.js:26`). Salida: subir a 24 si
se ve facetado de cerca. La montaña queda igual (el dueño la ve bien en celular).

**Medición (2026-11-26, Iris Xe):** red de Ryzomatica 169.320 → 11.880 triángulos. Home: dos Perlin eran 2×253.500 vértices por cuadro.
Diagnóstico de la lentitud local: `npm run dev` (dev + `--inspect`) ~15 ms de JS por cuadro contra ~1,4 ms con `next build && next start`;
la GPU la cargaban Perlin + montaña (195k segmentos). El crecimiento (245 ms una vez, 1 draw call) no era la causa.

**Base local (docker `sinapsis_front-db-1`):** migración 003 aplicada e import de la curaduría: 193→195 nodos, 344→347 vínculos,
Ryzomatica con `dendrita-v2`. Neon no se tocó.

Tests 281/281, lint sin errores, `next build` OK.
