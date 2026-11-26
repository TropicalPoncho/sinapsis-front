# Milestone 2 — Cuentas, carga y colaboración (contexto preparado)

**Preparado:** 2026-11-26, antes de cerrar v1.0. Lo consume `/gsd-new-milestone` cuando v1.0 esté
cerrado (04-13 UAT 3, 04.1-07 y Fase 5). No abrir v2 antes: el cambio de milestone archiva las
carpetas de fases y reinicia STATE.

**Objetivo:** que lxs creadxrs carguen y mantengan su propia parte de la red (entidades, obras,
eventos, vínculos, imágenes), empezando por el dueño como único usuario, y que las agrupaciones
sumen integrantes por invitación y aceptación.

## Decisiones que condicionan el milestone (van como ADRs en Notion antes de planificar)

### ADR-M2-1 · La invitación es un token para reclamar un nodo, no un email registrado
- **Decisión:** el dueño (o quien administre un nodo) genera un link `/invitacion/<token>` atado a un
  nodo existente (típicamente `is_stub`). Quien lo abre inicia sesión con cualquier método y recibe
  `permisos(usuario, nodo, 'administrar')`. Token de un solo uso, con vencimiento, guardado hasheado.
  Se manda por cualquier canal (WhatsApp, DM de Instagram, email).
- **Por qué:** hay personas de las que no se tiene email; el login no debe depender del email.
- **Descartada:** allowlist de emails (obliga a juntar emails y falla si la persona entra con otra cuenta).
- **Enmienda:** AUTH-01 ("código de invitación") se cumple con el token; VINC-03 cambia "invita por
  email" por "genera un link de reclamo"; VINC-04 queda igual (el stub deja de serlo al reclamarse).
- **Riesgo:** un link reenviado lo reclama otra persona. Mitigación: un solo uso, vencimiento corto,
  y quien lo generó ve quién lo reclamó y puede revocar.

### ADR-M2-2 · Auth con Better Auth, tablas en una migración del repo
- **Decisión:** Better Auth; su SQL se genera y se copia a `db/migrations/004_*.sql`. Métodos:
  Google y magic link por email (proveedor de envío a elegir en la fase, p. ej. Resend).
- **Por qué:** constraint del proyecto — ninguna herramienta externa autora el DDL
  (CLAUDE.md, Constraints; REQUIREMENTS.md Out of Scope sobre Strapi).
- **Descartadas:** Neon Auth (maneja su schema `neon_auth` fuera de las migraciones); Instagram como
  proveedor (la Basic Display API se cerró en dic 2024; la API vigente es solo para cuentas
  profesionales y requiere app review de Meta — verificar al planificar). El link de reclamo cubre a
  quien solo es ubicable por Instagram.
- **Enmienda:** AUTH-02 pasa a "Google o magic link por email".
- **Riesgo:** el flujo de magic link depende de entregabilidad de email (dominio verificado, SPF/DKIM).

### ADR-M2-3 · Organizaciones = AGRUPACION existente; aceptación vía `estado` en vínculos; permiso por defecto explícito
- **Decisión:** no hay nodeType nuevo (invariante: cuatro valores). Productora/colectivo/banda son
  `subtipo`; ser integrante es `INTEGRA`. Se agrega `vinculos.estado` (propuesto/aceptado/rechazado),
  ya previsto en `db/migrations/001_esquema_inicial.sql:149`, con CHECK y migración aditiva; la
  topología pública solo sirve aceptados (VINC-02). Al aceptar una invitación a una agrupación se
  insertan `permisos(usuario, agrupacion, 'editar')` para lxs usuarixs con `administrar` sobre la
  entidad que aceptó.
- **Por qué:** pedido del dueño ("en un principio cada integrante puede cambiar") sin acoplar
  autorización a contenido público: integrar no implica poder editar
  (`001_esquema_inicial.sql:143-147`). Es una política por defecto, revocable fila por fila.
- **Descartadas:** derivar el permiso del vínculo `INTEGRA` (rompe la separación permisos/vínculos);
  plugin de organizaciones de Better Auth (duplicaría el modelo de nodos y pertenencia).
- **Riesgo:** sin historial, cualquier integrante puede pisar o borrar. Mínimo del milestone:
  `updated_by`/`updated_at` en `nodos` y `vinculos` y borrado lógico. Historial completo y permisos
  finos por organización quedan fuera.

### ADR-M2-4 · Con edición en vivo, la base es la fuente y el import CSV deja de correr en producción
- **Decisión:** desde que el dashboard escriba en producción, `scripts/migracion/importar.ts`
  (hace TRUNCATE, PROJECT.md "Producción") no se corre contra Neon. Queda para bases locales/semillas.
- **Riesgo:** correrlo por costumbre borra lo cargado en vivo. Mitigación: guarda en el script que
  rechace `DATABASE_URL` de producción.

### ADR-M2-5 · El Usuario no es un nodo (corrige AUTH-03/AUTH-04)
- **Decisión:** AUTH-03 ("al registrarse se le crea una neurona") contradice el invariante. Se
  reescribe: registrarse sin invitación crea la primera ENTIDAD que esa persona controla; con
  invitación, reclama una existente. AUTH-04 ("color de su neurona") pasa a ser editar `viz_params`
  de una entidad que administra.

### ADR-M2-6 · Imágenes subidas a R2
- **Decisión:** bucket R2 (egress cero), `thumb` y galerías guardan claves relativas (invariante ya
  vigente); cambia la constante de base. Nombres en minúscula.
- **Riesgo:** subida directa desde el cliente requiere URLs firmadas y validar tipo y tamaño en el borde.

## Orden de fases propuesto

1. **Auth mínimo con un único usuario (el dueño).** Login Google, sin registro abierto. Tablas de
   Better Auth + `permisos` según `001_esquema_inicial.sql:131-141`; FK de `created_by`. El dueño
   tiene `administrar` sobre todos los nodos existentes (o flag de curador: decidir en discuss).
2. **Dashboard CRUD** de nodos, vínculos y fichas (`metadata.ficha`, bloques de `bloques.json`),
   chequeando `permisos` en el servidor. Reusa la validación de `scripts/migracion/importar.ts`.
   Es el panel de admin: el dueño reemplaza la planilla con él. Cubre OBRA-01/OBRA-03.
3. **Imágenes:** subida a R2 y galería con scroll junto a la ficha. El bloque galería ya existe
   (`src/app/Ficha.tsx`, UI-17); falta subir. Puede ir en paralelo a la 2. Cubre OBRA-02.
4. **Invitaciones** con token de reclamo + magic link. Abre el sistema a otras personas.
   Cubre AUTH-01, VINC-03, VINC-04.
5. **Vínculos con estado y agrupaciones por invitación/aceptación** con el permiso por defecto de
   ADR-M2-3. Cubre VINC-01, VINC-02.

Cada fase incluye su plan de auditoría ponytail antes de la compuerta humana (CLAUDE.md global).

## Fuera del milestone

- "Eventos cercanos" (BUSC-03/04): `location_id` es texto, no hay coordenadas; requiere geo.
- Permisos finos por organización (roles, aprobación de cambios) e historial completo de cambios.
- OBRA-04 (galería con mini-red) se reevalúa: hoy la ficha ya es la vista de obras.

## Puede ir antes, en v1.0

- **Home "eventos próximos":** es una Vista (EVENTO con `fecha` >= hoy), sin auth; "Próximo" ya
  existe en el portfolio (D-47). Candidato a quick o fase insertada en v1.0.
