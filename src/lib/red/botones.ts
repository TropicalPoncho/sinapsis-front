import type { NodoGrafo } from '../../types/vista.ts'

// `enlace` lo produce la ficha (plan 06) desde el detalle; acá ningún nodo lo genera.
export type Accion = 'expandir' | 'entrar' | 'enlace' | 'sumar'
export interface Boton { etiqueta: string; accion: Accion; destino?: string }
// `compone`: el nodo tiene un COMPONE que sale de él. `secciones`: cuántas secciones derivadas de los roles tiene (D-32).
export interface CtxBoton { compone: boolean; secciones: number; obrasPorSumar?: number }

// ponytail: sin override por subtipo; entra cuando algún subtipo lo necesite.
// D-26/D-33/D-48: Expandir si hay contenido: créditos (topología) o ficha cargada (flag de la topología, D-48). Un stub y un
// área nunca expanden; una ENTIDAD expande solo con ficha (sus secciones son su portfolio, que ya está en el menú de su red).
// D-26/D-36: Entrar si el nodo compone algo (un COMPONE que sale de él) o tiene secciones derivadas, para cualquier
// nodeType: "ingresar si compone algo", y desde ahí siempre se puede expandir. Un área sin miembros no entra.
// La URL del "Entrar" la arma quien ejecuta. Orden: Expandir, Entrar, Sumar.
export function botonesDe(n: NodoGrafo, c: CtxBoton): Boton[] {
  const botones: Boton[] = []
  const conCreditos = (n.nodeType === 'OBRA' || n.nodeType === 'EVENTO') && c.secciones > 0
  if (!n.isStub && n.nodeType !== 'AGRUPACION' && (n.ficha || conCreditos)) botones.push({ etiqueta: 'Expandir', accion: 'expandir' })
  if (c.compone || c.secciones > 0) botones.push({ etiqueta: `Entrar a ${n.label}`, accion: 'entrar' })
  if (n.nodeType === 'ENTIDAD' && (c.obrasPorSumar ?? 0) > 0) botones.push({ etiqueta: 'Sumar sus obras', accion: 'sumar' })
  return botones
}
