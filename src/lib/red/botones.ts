import type { NodoGrafo } from '../../types/vista.ts'

// `enlace` lo produce la ficha (plan 06) desde el detalle; acá ningún nodo lo genera.
export type Accion = 'expandir' | 'entrar' | 'enlace' | 'sumar'
export interface Boton { etiqueta: string; accion: Accion; destino?: string; hijos?: Boton[] }
// `secciones`: cuántas secciones derivadas de los roles tiene el nodo (D-32); es lo que decide Expandir.
export interface CtxBoton { grado: number; secciones: number; obrasPorSumar?: number }

// ponytail: sin override por subtipo; entra cuando algún subtipo lo necesite.
// D-26/D-33: Expandir si hay contenido que mostrar. Hoy solo los créditos viajan en la topología (texto, galería,
// video y enlaces viven en `metadata` y se piden al abrir), así que una obra con ficha y sin créditos no expande;
// salida: un booleano `ficha` en el dump de topología. La URL del "Entrar" la arma quien ejecuta.
export function botonesDe(n: NodoGrafo, c: CtxBoton): Boton[] {
  switch (n.nodeType) {
    case 'OBRA':
    case 'EVENTO':
      return n.isStub || c.secciones <= 0 ? [] : [{ etiqueta: 'Expandir', accion: 'expandir' }]
    case 'ENTIDAD':
    case 'AGRUPACION': {
      if (c.grado <= 0) return []
      const entrar: Boton = { etiqueta: `Entrar a ${n.label}`, accion: 'entrar' }
      return n.nodeType === 'ENTIDAD' && (c.obrasPorSumar ?? 0) > 0 ? [entrar, { etiqueta: 'Sumar sus obras', accion: 'sumar' }] : [entrar]
    }
  }
}
