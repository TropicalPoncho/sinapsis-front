// Fechas de la ficha y del panel (D-44). Puras y sin imports.

// La fecha llega como medianoche UTC; sin `timeZone` en Argentina se vería el día anterior. `conDia` agrega el día de la
// semana y saca el año (la forma del evento que viene); sin él, la forma larga de siempre.
export function fechaLarga(iso?: string, conDia = false): string | null {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-AR', conDia
    ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }
    : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// D-44: el día de la fecha (las de solo día llegan como medianoche UTC) contra `hoy` como 'YYYY-MM-DD'. El día del evento cuenta como futuro.
export const esFuturo = (iso: string | undefined, hoy: string): boolean => !!iso && iso.slice(0, 10) >= hoy

// D-49: período de un vínculo, fecha parcial AAAA | AAAA-MM | AAAA-MM-DD. Es el mismo patrón que el CHECK de
// db/migrations/002_vigencia_vinculos.sql (fechas.test.ts lo ata).
export const FECHA_PARCIAL = /^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$/

// Vacía vale. Un día completo tiene que sobrevivir la ida y vuelta por Date en UTC: JS corre el 30 de febrero al 2 de marzo.
const fechaOk = (f?: string) => !f || (FECHA_PARCIAL.test(f) && (f.length < 10 || new Date(`${f}T00:00:00Z`).toISOString().slice(0, 10) === f))

// Forma, calendario y orden (`hasta` no antes que `desde`, a la precisión que comparten). Un solo validador para el import,
// los tests y la UI de alta de M2; el CHECK de la base es la última barrera y no valida el calendario.
export function vigenciaOk(desde?: string, hasta?: string): boolean {
  if (!fechaOk(desde) || !fechaOk(hasta)) return false
  if (!desde || !hasta) return true
  const n = Math.min(desde.length, hasta.length)
  return hasta.slice(0, n) >= desde.slice(0, n)
}

// Último día del período, solo para comparar: '2023' → '2023-12-31', '2023-02' → '2023-02-31' (no es un día real).
export const finDe = (f: string): string => (f.length === 4 ? `${f}-12-31` : f.length === 7 ? `${f}-31` : f)

// Sin `hasta`, o con `hasta` de hoy en adelante: el día de `hasta` todavía cuenta (como el del evento en esFuturo) y "hasta 2023"
// quiere decir hasta fin de 2023.
// ponytail: `desde` no decide la vigencia (un `desde` futuro cuenta como integrante); salida: un tercer estado si aparece el caso.
export const vigente = (v: { hasta?: string }, hoy: string): boolean => !v.hasta || finDe(v.hasta) >= hoy

// El chip de período de una fila pasada: 'hasta 2023', '2019–2024' o, si es el mismo año, '2023'.
// ponytail: solo el año; salida: el mes ('hasta ene 2023') si el dueño lo pide.
export function periodo(hasta: string, desde?: string): string {
  const h = hasta.slice(0, 4)
  const d = desde?.slice(0, 4)
  return !d ? `hasta ${h}` : d === h ? h : `${d}–${h}`
}

// ponytail: la fecha es la del visitante, no la del evento; una fiesta de 22 a 04 hs pasa a "pasada" a las 00:00 del día siguiente
// y alguien en otra zona lo ve con un día de diferencia. Salida: zona por `locationId` cuando haya eventos fuera de Argentina.
export function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
