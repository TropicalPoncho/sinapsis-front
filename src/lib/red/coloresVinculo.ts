import type { TipoVinculo } from '../../types/vista.ts'

// Paleta de marca de Tropical Poncho (src/styles/style.css, --ColorPalette-*). Módulo neutral:
// lo usa tanto el motor (LinkThreeObject, en hex numérico) como el panel de debug (en CSS),
// sin que ninguno de los dos importe al otro.
export const COLOR_POR_TIPO_VINCULO: Partial<Record<TipoVinculo, string>> = {
  PRODUJO: '#FFBC00', // Amarillo — quién produjo/organizó
  INTEGRA: '#8AE2C8', // Turquesa — pertenencia
  COLABORO_EN: '#FF0074', // Fuccia — colaboración (color histórico del link)
  CORREALIZO: '#9900FF', // Violeta — co-realización
  INSPIRO: '#578CCB', // Cian — inspiración
}

// COMPONE, SUCEDE_EN, PRECEDE y REGISTRO son vínculos estructurales/de metadata, no
// colaboraciones artísticas: caen todos al mismo gris neutro en vez de pelear por otro color de la paleta.
export const COLOR_VINCULO_DEFAULT = '#999999'

export function colorDeVinculo(tipo: TipoVinculo): string {
  return COLOR_POR_TIPO_VINCULO[tipo] ?? COLOR_VINCULO_DEFAULT
}
