import type { NodoGrafo } from '../../types/vista.ts'

// `enlace` lo produce la ficha (plan 06) desde el detalle; acá ningún nodo lo genera.
export type Accion = 'expandir' | 'entrar' | 'enlace'
export interface Boton { etiqueta: string; accion: Accion; destino?: string }
// `compone`: el nodo tiene un COMPONE que sale de él. `secciones`: cuántas secciones derivadas de los roles tiene (D-32).
export interface CtxBoton { compone: boolean; secciones: number }

// ponytail: sin override por subtipo; entra cuando algún subtipo lo necesite.
// D-26/D-33/D-48 + 261029-hui: Expandir si hay contenido que mostrar: créditos o portfolio (las secciones derivadas, para los tres
// nodeType con ficha) o ficha cargada (flag de la topología, D-48). Una ENTIDAD con portfolio expande aunque no tenga About: la ficha
// muestra solo el Portfolio. Un stub y un área nunca expanden.
// D-26/D-36: Entrar si el nodo compone algo (un COMPONE que sale de él) o tiene secciones derivadas, para cualquier
// nodeType: "ingresar si compone algo", y desde ahí siempre se puede expandir. Un área sin miembros no entra.
// La URL del "Entrar" la arma quien ejecuta. Orden: Expandir, Entrar. ("Sumar sus obras" se sacó en 261029-hui.)
export function botonesDe(n: NodoGrafo, c: CtxBoton): Boton[] {
  const botones: Boton[] = []
  const conSecciones = (n.nodeType === 'OBRA' || n.nodeType === 'EVENTO' || n.nodeType === 'ENTIDAD') && c.secciones > 0
  if (!n.isStub && n.nodeType !== 'AGRUPACION' && (n.ficha || conSecciones)) botones.push({ etiqueta: 'Expandir', accion: 'expandir' })
  if (c.compone || c.secciones > 0) botones.push({ etiqueta: `Entrar a ${n.label}`, accion: 'entrar' })
  return botones
}
