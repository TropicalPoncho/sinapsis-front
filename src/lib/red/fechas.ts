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

// ponytail: la fecha es la del visitante, no la del evento; una fiesta de 22 a 04 hs pasa a "pasada" a las 00:00 del día siguiente
// y alguien en otra zona lo ve con un día de diferencia. Salida: zona por `locationId` cuando haya eventos fuera de Argentina.
export function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
