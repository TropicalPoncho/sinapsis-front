import type { NodoGrafo } from '../../types/vista.ts'

// `enlace` lo produce la ficha (plan 06) desde el detalle; acá ningún nodo lo genera.
export type Accion = 'expandir' | 'entrar' | 'enlace' | 'sumar'
export interface Boton { etiqueta: string; accion: Accion; destino?: string; hijos?: Boton[] }
// `compone`: el nodo tiene un COMPONE que sale de él. `secciones`: cuántas secciones derivadas de los roles tiene (D-32).
export interface CtxBoton { compone: boolean; secciones: number; obrasPorSumar?: number }

// ponytail: sin override por subtipo; entra cuando algún subtipo lo necesite.
// D-26/D-33: Expandir si hay contenido que mostrar. Hoy solo los créditos viajan en la topología (texto, galería,
// video y enlaces viven en `metadata` y se piden al abrir), así que una obra con ficha y sin créditos no expande;
// salida: un booleano `ficha` en el dump de topología.
// D-26/D-36: Entrar si el nodo compone algo (un COMPONE que sale de él) o tiene secciones derivadas, para cualquier
// nodeType: "ingresar si compone algo", y desde ahí siempre se puede expandir. Un área sin miembros no entra.
// La URL del "Entrar" la arma quien ejecuta. Orden: Expandir, Entrar, Sumar.
export function botonesDe(n: NodoGrafo, c: CtxBoton): Boton[] {
  const botones: Boton[] = []
  if ((n.nodeType === 'OBRA' || n.nodeType === 'EVENTO') && !n.isStub && c.secciones > 0) botones.push({ etiqueta: 'Expandir', accion: 'expandir' })
  if (c.compone || c.secciones > 0) botones.push({ etiqueta: `Entrar a ${n.label}`, accion: 'entrar' })
  if (n.nodeType === 'ENTIDAD' && (c.obrasPorSumar ?? 0) > 0) botones.push({ etiqueta: 'Sumar sus obras', accion: 'sumar' })
  return botones
}
