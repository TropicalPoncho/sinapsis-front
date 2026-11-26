---
created: 2026-11-26
title: Ryzomatica — crecimiento menos parejo, que elija caminos y sea más grueso cerca del centro
area: crecimiento (D-52, dendrita)
files: [src/lib/crecimiento/dendrita.ts]
---
## Problema
"Me gustaria q no sea tan parejo y crezca de forma uniforme sino que vaya eligiendo un camino en particular. mas como las imagenes q te
mande, y que mas cerca del centro sea más grueso." (UAT de cierre, 2026-11-26)
## Restricción (D-52)
El algoritmo está congelado por versión con test de oro. Mientras Ryzomatica no se importe a Neon, v2 no está publicada y se puede ajustar
(regenerar el test de oro). Si se importa antes, el cambio es `dendrita-v3`.
## Idea
Ramas dominantes (pocas raíces con prioridad alta que acaparan los pasos, el resto atrofiadas) y grosor por distancia al núcleo (ancho por
vértice o varias pasadas de `LineSegments`; WebGL no respeta `linewidth`).
