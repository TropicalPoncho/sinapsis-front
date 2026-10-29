---
quick_id: 261029-hui
type: execute
autonomous: true
---
# Listas (orden + Próximos/Pasados), Volver abajo, Expandir vs Entrar

Feedback del UAT del dueño (2026-10-29). Sin cambiar el modelo de datos.

1. **Orden**: en la lista lateral de un área (ej. Obras de Tropical) los eventos van del más reciente al más viejo, en todos los dueños (hoy `entre` en seccionesDe usa porFecha para EVENTO/OBRA/AGRUPACION; ahora `porReciente` siempre; las ediciones PRECEDE ya no se leen cronológico — actualizá tests y la nota de D-47).
2. **Subtítulos Próximos / Pasados**: en la lista lateral y en el portfolio de la ficha expandida, los eventos de hoy en adelante van bajo un subtítulo "Próximos" y el resto bajo "Pasados". `Seccion.proximos` ya cuenta los próximos; el subtítulo "Pasados" solo aparece si hay próximos (si no hay ninguno, lista plana). Sin fecha → Pasados, al final. Estilo del subtítulo acorde al BranchedMenu (chico, minúscula/espaciado). Hoy en la ficha el "Próximo" no se distingue de los pasados: tiene que quedar claro.
3. **VOLVER abajo de todo**: el dueño lo pidió varias veces. En la lista lateral (desktop) y donde exista, el botón Volver va al FINAL de la lista, nunca arriba. Verificalo en desktop 1280 y en mobile 390 con captura.
4. **Sacar el botón "Sumar sus obras"** (y su cableado muerto: LIMITE_SUMA/sumados solo si queda sin uso; si D-22 lo sigue necesitando para créditos, dejá eso). Anotá en el SUMMARY qué quedó.
5. **Expandir para entidades con portfolio**: Sello Rojo (y cualquier ENTIDAD con filas de portfolio, aunque no tenga About) debe ofrecer Expandir: hoy el flag `ficha` sale solo de tener About. La ficha sin About muestra solo el Portfolio (columna izquierda vacía o portfolio ocupando). Regla en un solo lugar (topología/route + botones.ts).
6. **Expandir ≠ Entrar visualmente**: estilos de botón claramente distintos (ej. Entrar = acción primaria llena/acento; Expandir = secundaria con borde/ícono de despliegue). Que se lea la diferencia en desktop y mobile.
7. **Descripción breve de Tropical** en data/curaduria/nodos.csv: reemplazar por "Plataforma de creación transdisciplinaria dedicada al diseño y la producción de experiencias y contextos que promueven la expresión creativa, el encuentro y el desarrollo de iniciativas colectivas." (hoy "Productora de Experiencias Artísticas" o similar; verificá el campo correcto). No tocar otros nodos.
8. **Tropical: no mostrar Integrantes ni Ex integrantes** en su portfolio/ficha por ahora (el dueño: "después pensamos cómo configurarlo por cada unx"): sacalo vía la config de portfolios en roles.json o la regla más chica, con `ponytail:` (techo: fijo, salida: preferencia por entidad) — otras organizaciones (Club Weyba, In Session, Post.xno) NO cambian. Si el executor del plan 261029-hdu ya hizo algo parecido para el home, reutilizalo.

## Reglas
- Invariantes de CLAUDE.md. Nunca leas .env*, nunca toques Neon. Tests/tsc/lint verdes (actualizá tests que pinnean orden). Playwright headless en tu propio `next dev` 3003 desde copia aislada (TOPOLOGIA_FIXTURE); NO uses el 3000 del dueño. Capturas en el task_dir.
- Commits atómicos con trailer Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>. SUMMARY al terminar.
- Fuera de alcance (tintero, no construir): subir flyer por evento y galería de próximos eventos; configuración de qué ve cada unx.
