---
created: 2026-11-26
title: Áreas internas de Tropical fuera de la red general; adentro, conectadas entre sí y sin la raíz
area: red / Vista (Fase 4, enmienda de D-24)
files: [src/lib/red/home.ts, src/lib/red/vista*.ts, src/lib/red/menus.ts]
---
## Problema
Pedido del dueño en el UAT de cierre (2026-11-26): "Las areas 'tecnologia' 'obras' son internas de tp, no tienen q verse en la red general.
Y dentro de tropical quiero ver todas conectadas entre si. y sin que se vea el nodo raiz de tropical."
- Hoy `esDelHome` (`src/lib/red/home.ts`) mete toda AGRUPACION en el home.
- D-24 dibuja a Tropical + sus áreas, con vínculos entre áreas solo si sus miembros se vinculan.
## Solución a discutir
- Home: sacar las AGRUPACION que son áreas de una entidad (tienen COMPONE desde una ENTIDAD). Regla de datos, no por id.
- Red de una entidad con áreas: sin la raíz visible y las áreas unidas entre sí (todas con todas, o un anillo). Ojo: la cámara y el título
  hoy se apoyan en la raíz enfocada; sacarla del dibujo no puede sacarla de la Vista (D-25: el nombre fijo arriba sale de ahí).
