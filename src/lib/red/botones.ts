import type { NodoGrafo } from '../../types/vista.ts'

// `enlace` lo produce la ficha (plan 06) desde el detalle; acá ningún nodo lo genera.
export type Accion = 'expandir' | 'entrar' | 'enlace' | 'sumar'
export interface Boton { etiqueta: string; accion: Accion; destino?: string; hijos?: Boton[] }
export interface CtxBoton { grado: number; obrasPorSumar?: number }

// ponytail: sin override por subtipo; entra cuando algún subtipo lo necesite.
// "Ver menos" y "Entrar" sin destino los decide el overlay; la URL la arma quien ejecuta.
export function botonesDe(n: NodoGrafo, c: CtxBoton): Boton[] {
  switch (n.nodeType) {
    case 'OBRA':
    case 'EVENTO':
      return n.isStub || !n.descripcionBreve ? [] : [{ etiqueta: 'Ver más', accion: 'expandir' }]
    case 'ENTIDAD':
    case 'AGRUPACION': {
      if (c.grado <= 0) return []
      const entrar: Boton = { etiqueta: `Entrar a ${n.label}`, accion: 'entrar' }
      return n.nodeType === 'ENTIDAD' && (c.obrasPorSumar ?? 0) > 0 ? [entrar, { etiqueta: 'Sumar sus obras', accion: 'sumar' }] : [entrar]
    }
  }
}
