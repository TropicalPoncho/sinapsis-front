<!-- GSD:project-start source:PROJECT.md -->
## Project

**Sinápsis**

Red social para artistas y obra colectiva, visualizada como una red neuronal 3D navegable.
Cada artista, obra, serie, espacio cultural y evento es un **nodo**; cada colaboración es un
**vínculo**. Está pensada para artistas, productoras, centros culturales y curadores que
quieren mostrar su trabajo y hacer visible con quién lo hicieron.

El descubrimiento es el producto: se explora siguiendo vínculos, no scrolleando un feed.

**Core Value:** Que la red se pueda mirar desde cualquier punto de vista sin cambiar el modelo de datos.
La misma red tiene que poder mostrarse centrada en un artista, en una obra, en un espacio
o de forma global — y eso es configuración de una **Vista**, nunca un campo del nodo.

### Constraints

- **Tech stack**: Next 15 + React 19 + TypeScript + Tailwind — ya está en el repo, no se reabre
- **Tech stack**: Postgres único como fuente de verdad, con el schema gobernado por migraciones SQL de este repo. Ninguna herramienta externa autora el DDL
- **Arquitectura**: el motor 3D es vanilla y no importa React; React no importa THREE.
  Un único archivo de puente entre ambos
- **Performance**: la red 3D tiene que ir fluida en dispositivos de gama media (RNF-03 de la ERS).
  El techo real es la GPU, no la base: hoy cada nodo es un draw call
- **Datos**: los parámetros visuales del nodo son escalares en la base, nunca código.
  Si un nodo pudiera traer GLSL propio, instancing queda descartado para siempre
- **Compatibilidad**: `collectiveConscience` sigue en producción y no se modifica
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

## Disciplina

Escribí el mínimo código que funcione. Antes de agregar algo, en este orden: ¿hace falta que
exista?, ¿ya está en el repo?, ¿lo hace la stdlib o la plataforma?, ¿lo hace una dependencia
que ya está instalada?, ¿entra en una línea? Recién ahí, código nuevo. Nada de abstracciones
sin pedido: nada de interfaces con una sola implementación, factories para un solo producto,
ni config para un valor que nunca cambia. Borrar gana sobre agregar.

Marcá las simplificaciones deliberadas con un comentario `ponytail:` que nombre el techo y el
camino de salida, por ejemplo `// ponytail: topología en RAM; graph DB si supera 1M de aristas`.

Nunca simplificar: validación en los bordes de confianza, manejo de errores que evita pérdida
de datos, seguridad, accesibilidad básica, y lo que se haya pedido explícitamente.

### Invariantes que rompen la arquitectura si se violan

Estas no son preferencias de estilo. Cada una existe por una decisión registrada en
`.planning/PROJECT.md`; si alguna parece necesaria, la discusión va antes que el código.

- **El motor no importa React y React no importa THREE.** Un solo archivo de puente. Ya se
  intentó al revés en la rama `task/Refactor-en-React` y falló.
- **El canvas es fondo permanente y nunca se desmonta.** Vive por encima del router; las rutas
  son overlays flotantes. Montar el canvas dentro de una página rompe la continuidad 3D, que es
  el producto. Hay una sola instancia del motor en toda la app — la "mini-red" de la galería es
  este mismo canvas con la cámara encuadrada, no una segunda instancia.
- **El puente es bidireccional.** React le pasa al motor el área segura del viewport; el motor
  reporta dónde quedó en pantalla el nodo enfocado. Ninguna de las dos direcciones se saltea
  poniendo al otro a adivinar.
- **Navegar es coreografía, no paralelismo.** Un cambio de ruta secuencia Vista, animación de
  cámara y overlay. Las animaciones de cámara tienen que ser esperables desde afuera.
- **`dimensionId` no existe.** La distancia de un nodo a la raíz se calcula en el traversal de
  la Vista, nunca se persiste ni se cachea como fuente de verdad.
- **`viz_params` guarda escalares, jamás GLSL ni código.** Si un nodo pudiera traer su propio
  shader, instancing queda descartado para siempre.
- **La transición es independiente de la consulta.** Cualquier Vista se alcanza con
  `reemplazo`, `filtrado` o `aditivo`. Atarlas es el bug que se está viniendo a arreglar.
- **La Vista vive en la URL.** No se reintroduce un stack de navegación propio ni snapshots.
- **`CUSTOM` no entra en el enum de `tipo_vinculo`.** El escape hatch es el campo `rol`.
- **Una sola base.** Postgres es la fuente de verdad; el `metadata jsonb` es la "data profunda".
- **`collectiveConscience` se lee, no se toca.** Sigue en producción como sitio de la productora.
