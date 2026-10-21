// D-41: qué neuronas aparecen en cada contexto, sobre la topología de los CSV (no la base viva), con el mismo `subgrafoDe` del
// Shell y el mismo `seccionesDe` del Overlay. Es una caracterización: un cambio deliberado de la Vista tiene que actualizar este
// archivo y `04.1-NEURONAS.md`, cuya tabla afirma cada número de acá.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { construirAdyacencia } from '../vista/adyacencia.ts'
import { resolverVista } from '../vista/resolverVista.ts'
import { leerCsv } from '../../../scripts/migracion/csv.ts'
import type { NodeType, NodoGrafo, TipoVinculo } from '../../types/vista.ts'
import { indexarSlugs } from './slugs.ts'
import { LIMITE_HOME } from './home.ts'
import { agrupadoresDe, obrasDe, padreDe, seccionesDe, type VocabularioRoles } from './menus.ts'
import { LIMITE_SUMA, LIMITE_VISTA, subgrafoDe, vistaDe, type EstadoRed } from './url.ts'

const vocab: VocabularioRoles = JSON.parse(readFileSync(new URL('./roles.json', import.meta.url), 'utf8'))
const leer = (f: string) => leerCsv(readFileSync(new URL(`../../../data/curaduria/${f}`, import.meta.url), 'utf8'))
const filas = leer('nodos.csv').filter((r) => r.descartar !== 'si')
const vivos = new Set(filas.map((r) => r.id))
const nodos: NodoGrafo[] = filas.map((r) => ({
  id: r.id, nodeType: r.node_type as NodeType, subtipo: r.subtipo, label: r.label, vizParams: { shape: 's', color: '#111' },
  isStub: r.is_stub === 'si', fecha: r.fecha || undefined,
}))
const vinculos = leer('vinculos.csv').filter((r) => r.descartar !== 'si' && vivos.has(r.origen) && vivos.has(r.destino))
  .map((r) => ({ id: r.id, origen: r.origen, destino: r.destino, tipoVinculo: r.tipo_vinculo as TipoVinculo, rol: r.rol || undefined }))
const ady = construirAdyacencia({ nodos, vinculos })
const idx = indexarSlugs(nodos)

const id = (slug: string) => idx.idPorSlug.get(slug)!
const E = (red: string | null, enfocado: string | null, prof: number | null = null): EstadoRed => ({ enfocado, red, prof, semilla: null, raiz: null, puentes: null })
const escena = (e: EstadoRed, guardados: string[] = []) => subgrafoDe(ady, idx, e, guardados, { semilla: 'auditoria', limiteHome: LIMITE_HOME })
const tiposDe = (sub: { nodos: NodoGrafo[] }) => {
  const t: Record<string, number> = {}
  for (const n of sub.nodos) t[n.nodeType] = (t[n.nodeType] ?? 0) + 1
  return t
}
const labels = (sub: { nodos: NodoGrafo[] }, tipo?: NodeType) => sub.nodos.filter((n) => !tipo || n.nodeType === tipo).map((n) => n.label).sort()
// La escena que tenía la red antes de D-45 (Vista general) y la que tendría sin tope: solo para medir.
const baseDe = (slug: string, conObras: boolean, limite?: number) => {
  const r = id(slug)
  return resolverVista(ady, { ...vistaDe(E(slug, slug), r, ady.nodos.get(r)!.nodeType, agrupadoresDe(ady, r).length > 0, conObras), ...(limite && { limite }) })
}
const secciones = (slug: string) => seccionesDe(ady, id(slug), vocab)

// Contexto -> [escena antes de D-45, escena ahora, tipos ahora, vínculos PRECEDE dibujados]. Entrar a una red es `red = enfocado = slug` (Overlay: Entrar / irA(.., true)).
const entrar: [string, number, number, Record<string, number>, number][] = [
  ['tropical-poncho', 6, 6, { ENTIDAD: 1, AGRUPACION: 5 }, 0],
  ['obras', 17, 17, { EVENTO: 17 }, 18],
  ['soma', 17, 17, { EVENTO: 3, ENTIDAD: 12, OBRA: 1, AGRUPACION: 1 }, 2],
  ['tempistica-i', 40, 40, { EVENTO: 3, ENTIDAD: 36, AGRUPACION: 1 }, 2],
  ['alterego', 8, 8, { EVENTO: 2, ENTIDAD: 5, AGRUPACION: 1 }, 1],
  ['entropia-mapping', 3, 3, { OBRA: 1, ENTIDAD: 1, EVENTO: 1 }, 0],
  ['keuken-aonikenk', 17, 5, { ENTIDAD: 1, EVENTO: 4 }, 1],
  ['espacio-ave-fenix', 30, 5, { ENTIDAD: 1, EVENTO: 4 }, 1],
  ['rama-cerratto', 40, 17, { ENTIDAD: 1, EVENTO: 15, OBRA: 1 }, 14],
  ['rayo', 39, 3, { ENTIDAD: 1, EVENTO: 2 }, 1],
  ['club-weyba', 9, 3, { ENTIDAD: 1, EVENTO: 2 }, 1],
  ['in-session', 14, 2, { ENTIDAD: 1, EVENTO: 1 }, 0],
  ['kirtan-rock', 13, 2, { ENTIDAD: 1, EVENTO: 1 }, 0],
  ['cultura-del-sur', 23, 2, { ENTIDAD: 1, EVENTO: 1 }, 0],
  ['federico-urdinez', 6, 6, { ENTIDAD: 6 }, 0],
  ['luca-zisa', 17, 4, { ENTIDAD: 1, EVENTO: 3 }, 1],
  ['juan-balladobres', 19, 2, { ENTIDAD: 1, EVENTO: 1 }, 0],
  ['laura-trotta', 28, 2, { ENTIDAD: 1, EVENTO: 1 }, 0],
  ['melodrumma', 13, 2, { ENTIDAD: 1, EVENTO: 1 }, 0],
  ['julieta-agriano', 16, 2, { ENTIDAD: 1, EVENTO: 1 }, 0],
  ['aggromance', 23, 2, { ENTIDAD: 1, EVENTO: 1 }, 0],
  ['rochi', 1, 1, { ENTIDAD: 1 }, 0], // sin vínculos: la escena es ella sola
]
for (const [slug, antes, ahora, tipos, precede] of entrar) {
  test(`neuronas: entrar a ${slug} ve ${ahora} (antes de D-45, ${antes})`, () => {
    const r = escena(E(slug, slug))
    assert.equal(baseDe(slug, false).nodos.length, antes)
    assert.equal(r.sub.nodos.length, ahora); assert.deepEqual(tiposDe(r.sub), tipos); assert.deepEqual(r.sumados, [])
    assert.equal(r.sub.vinculos.filter((v) => v.tipoVinculo === 'PRECEDE').length, precede)
    // Lo que alcanzaría sin tope: solo Tempistica I se pasa (por 2).
    assert.equal(baseDe(slug, obrasDe(ady, id(slug)).length > 0, 1e9).nodos.length, slug === 'tempistica-i' ? 42 : ahora)
  })
}

test('neuronas: la home con semilla fija son 40 entidades y no cambia con D-45', () => {
  const r = escena(E(null, null))
  assert.equal(r.sub.nodos.length, LIMITE_HOME); assert.deepEqual(tiposDe(r.sub), { ENTIDAD: 40 })
  assert.deepEqual(escena(E(null, null)).sub.nodos.map((n) => n.id), r.sub.nodos.map((n) => n.id))
})

test('D-45: una entidad sin áreas ve su raíz y sus eventos y obras, sin otras personas y con los PRECEDE', () => {
  const casos: [string, string[], number][] = [
    ['keuken-aonikenk', ['Alterego', 'Entropía', 'Punk Estelar', 'Punk Solar'], 1],
    ['espacio-ave-fenix', ['C.E.P.A.', 'Concierto Público #4 ft Tropical Poncho', 'ESPORA', 'Luca Zisa en Ave Fenix'], 1],
    ['rama-cerratto', ['Alterego', 'Anomalia', 'C.E.P.A.', 'ESPORA', 'Entropía', 'Entropía (Mapping)', 'Kutral', 'NUDO', 'Punk Estelar', 'Punk Solar', 'SOMA', 'SOMA beta', 'Tempistica I', 'Tempistica II', 'Tropical Posporno', 'Tropical Posporno: Distopia'], 14],
    ['club-weyba', ['Alterego', 'Luca Zisa en Ave Fenix'], 1],
    ['kirtan-rock', ['SOMA'], 0],
    ['in-session', ['SOMA'], 0],
    ['rayo', [], 1],
    ['cultura-del-sur', ['SOMA beta'], 0], // por SUCEDE_EN: festival -> espacio. Sin secciones, así que sin botón Entrar (D-36)
  ]
  for (const [slug, esperados, precede] of casos) {
    const { sub } = escena(E(slug, slug))
    const dueno = ady.nodos.get(id(slug))!.label
    assert.deepEqual(labels(sub, 'ENTIDAD'), [dueno], slug)
    assert.ok(sub.nodos.every((n) => n.id === id(slug) || n.nodeType === 'EVENTO' || n.nodeType === 'OBRA'), slug)
    if (esperados.length) for (const l of esperados) assert.ok(labels(sub).includes(l), `${slug} sin ${l}`)
    assert.equal(sub.vinculos.filter((v) => v.tipoVinculo === 'PRECEDE').length, precede, slug)
    assert.ok(sub.vinculos.every((v) => !v.virtual), `${slug}: puentes apagados`)
  }
  assert.deepEqual(labels(escena(E('keuken-aonikenk', 'keuken-aonikenk')).sub, 'EVENTO'), ['Alterego', 'Entropía', 'Punk Estelar', 'Punk Solar'])
  assert.deepEqual(labels(escena(E('espacio-ave-fenix', 'espacio-ave-fenix')).sub, 'EVENTO'), ['C.E.P.A.', 'Concierto Público #4 ft Tropical Poncho', 'ESPORA', 'Luca Zisa en Ave Fenix'])
  assert.equal(labels(escena(E('rama-cerratto', 'rama-cerratto')).sub, 'OBRA').length + labels(escena(E('rama-cerratto', 'rama-cerratto')).sub, 'EVENTO').length, obrasDe(ady, id('rama-cerratto')).length)
})

test('D-45: las entidades sin obras ni eventos entran a la Vista general; con ?prof=2 la tienen todas', () => {
  const sinAreas = nodos.filter((n) => n.nodeType === 'ENTIDAD' && agrupadoresDe(ady, n.id).length === 0)
  const sinObras = sinAreas.filter((n) => obrasDe(ady, n.id).length === 0)
  assert.equal(sinAreas.length, 165); assert.equal(sinObras.length, 11)
  assert.equal(Math.max(...sinAreas.map((n) => obrasDe(ady, n.id).length)), 16) // Rama: el tope de 40 no se toca
  const e = E('federico-urdinez', 'federico-urdinez')
  assert.deepEqual(escena(e).sub.nodos.map((n) => n.id), baseDe('federico-urdinez', false).nodos.map((n) => n.id))
  assert.equal(escena(E('rama-cerratto', 'rama-cerratto', 2)).sub.nodos.length, 40)
  assert.deepEqual(tiposDe(escena(E('rama-cerratto', 'rama-cerratto', 2)).sub), { ENTIDAD: 39, AGRUPACION: 1 })
  // Sin tope serían 153: lo que queda afuera de la Vista general de Rama.
  assert.equal(baseDe('rama-cerratto', false, 1e9).nodos.length, 153)
})

test('D-45: ninguna entidad sin áreas con obras o eventos pasa del tope ni queda con la escena vacía', () => {
  for (const n of nodos.filter((x) => x.nodeType === 'ENTIDAD' && agrupadoresDe(ady, x.id).length === 0)) {
    const slug = idx.slugPorId.get(n.id)!
    const { sub } = escena(E(slug, slug))
    assert.ok(sub.nodos.length <= LIMITE_VISTA, slug)
    if (obrasDe(ady, n.id).length) assert.ok(sub.nodos.length >= 2 && sub.nodos.every((x) => x.id === n.id || x.nodeType === 'EVENTO' || x.nodeType === 'OBRA'), slug)
  }
})

test('D-36: entrar a una obra o un evento muestra solo su red (SOMA, Alterego, Entropía (Mapping))', () => {
  assert.ok(labels(escena(E('soma', 'soma')).sub, 'ENTIDAD').includes('Rama Cerratto'))
  assert.equal(escena(E('alterego', 'alterego')).sub.nodos.length, 8)
  assert.deepEqual(labels(escena(E('entropia-mapping', 'entropia-mapping')).sub), ['Entropía', 'Entropía (Mapping)', 'Rama Cerratto'])
})

test('tope: Tempistica I alcanza 42 nodos y entran 40; lo que queda afuera sigue en sus secciones', () => {
  assert.equal(baseDe('tempistica-i', false, 1e9).nodos.length, 42)
  assert.equal(escena(E('tempistica-i', 'tempistica-i')).sub.nodos.length, LIMITE_VISTA)
})

test('abrir una sección no cambia la escena y sus nodos ya están (DJ en SOMA, Eventos en Keuken Aonikenk)', () => {
  for (const [slug, seccion, esperados] of [['soma', 'dj', 4], ['keuken-aonikenk', 'eventos', 4]] as const) {
    const sub = escena(E(slug, slug)).sub
    const s = secciones(slug).find((x) => x.id === seccion)!
    assert.equal(s.nodos.length, esperados)
    assert.ok(s.nodos.every((q) => sub.nodos.some((n) => n.id === q.id)), `${slug}/${seccion}`)
    for (const q of s.nodos) assert.deepEqual(escena(E(slug, idx.slugPorId.get(q.id)!)).sumados, []) // tocarlo lo enfoca sin sumar
  }
})

test('tocar un nodo de la lista que no está en la base suma uno (Organizaciones de Rama -> Tropical Poncho)', () => {
  const base = escena(E('rama-cerratto', 'rama-cerratto')).sub.nodos.length
  assert.equal(base, 17)
  const organizaciones = secciones('rama-cerratto').find((s) => s.id === 'organizaciones')!
  assert.deepEqual(organizaciones.nodos.map((q) => ady.nodos.get(q.id)!.label), ['Tropical Poncho'])
  const r = escena(E('rama-cerratto', 'tropical-poncho'))
  assert.equal(r.sub.nodos.length, 18); assert.deepEqual(r.sumados, [id('tropical-poncho')])
  assert.deepEqual(tiposDe(r.sub), { ENTIDAD: 2, EVENTO: 15, OBRA: 1 })
})

test('desde la ficha de SOMA, Rama Cerratto entra a la red de SOMA con Rama enfocada y sin sumar', () => {
  const r = escena(E('soma', 'rama-cerratto'))
  assert.equal(r.sub.nodos.length, 17); assert.deepEqual(r.sumados, [])
  assert.ok(r.sub.nodos.some((n) => n.id === id('rama-cerratto')))
})

test('"Sumar sus obras" de Rama en otra red: lo que falta, con tope de LIMITE_SUMA y 40 + 12 como máximo', () => {
  const faltan = (red: string) => {
    const en = new Set(escena(E(red, 'rama-cerratto')).sub.nodos.map((n) => n.id))
    return obrasDe(ady, id('rama-cerratto')).filter((x) => !en.has(x))
  }
  const tempistica = escena(E('tempistica-i', 'rama-cerratto'), faltan('tempistica-i'))
  assert.equal(tempistica.sumados.length, LIMITE_SUMA); assert.equal(tempistica.sub.nodos.length, LIMITE_VISTA + LIMITE_SUMA) // faltan 13, entran 12
  assert.deepEqual(tiposDe(tempistica.sub), { EVENTO: 14, ENTIDAD: 36, AGRUPACION: 1, OBRA: 1 })
  const keuken = escena(E('keuken-aonikenk', 'rama-cerratto'), faltan('keuken-aonikenk'))
  assert.equal(keuken.sumados.length, LIMITE_SUMA); assert.equal(keuken.sub.nodos.length, 17) // faltan 12 más Rama: 13, entran 12
  // Con más de LIMITE_SUMA guardados gana lo último y el total no pasa de 40 + 12.
  const base = new Set(escena(E('tempistica-i', 'tempistica-i')).sub.nodos.map((n) => n.id))
  const libres = nodos.map((n) => n.id).filter((x) => !base.has(x))
  const lleno = escena(E('tempistica-i', 'tempistica-i'), libres.slice(0, 20))
  assert.equal(lleno.sumados.length, LIMITE_SUMA); assert.equal(lleno.sub.nodos.length, LIMITE_VISTA + LIMITE_SUMA)
})

test('menú de cada red: etiquetas y cantidad por sección (D-40, y D-46 para personas)', () => {
  // Producción(4) en SOMA: Tropical, In Session, Rama Cerratto (desde 2026-10-20) y Mechi Botta (PRODUJO confirmados por el dueño).
  const menu = (slug: string) => secciones(slug).map((x) => `${x.label}(${x.nodos.length})`).join(', ')
  assert.equal(menu('soma'), 'Producción(4), Meditación(1), Actividades(1), Performance(1), Bandas en vivo(2), DJ(4), VJ(1), Otros(1)')
  assert.equal(menu('tempistica-i'), 'Producción(3), Meditación(1), Performance(3), Bandas en vivo(1), DJ(3), Audiovisual(3), Exposición(1), Charlas(2), Pintura en vivo(1), Circo(2), Cocina(7), Armonía(2), Rush(5), Otros(6)')
  assert.equal(menu('alterego'), 'Producción(3), DJ(2), Espacio(1)')
  assert.equal(menu('entropia-mapping'), 'Mapping(2)')
  assert.equal(menu('keuken-aonikenk'), 'Eventos(4)'); assert.equal(menu('espacio-ave-fenix'), 'Eventos(4)')
  assert.equal(menu('rama-cerratto'), 'Participaciones(15), Obras(1), Organizaciones(1)')
  assert.equal(menu('rayo'), 'Participaciones(2)'); assert.equal(menu('club-weyba'), 'Eventos producidos(2), Integrantes(1)')
  assert.equal(menu('in-session'), 'Eventos producidos(1), Integrantes(2)'); assert.equal(menu('kirtan-rock'), 'Conciertos(1)')
  assert.equal(menu('cultura-del-sur'), ''); assert.equal(menu('federico-urdinez'), 'Organizaciones(2)')
})

test('etiquetas por contexto (D-40) sobre los CSV', () => {
  const ids = (slug: string) => secciones(slug).map((s) => s.id)
  assert.deepEqual(ids('keuken-aonikenk'), ['eventos'])
  assert.deepEqual(ids('espacio-ave-fenix'), ['eventos'])
  assert.deepEqual(ids('kirtan-rock'), ['conciertos'])
  assert.deepEqual(ids('rayo'), ['participaciones'])
  assert.deepEqual(ids('rama-cerratto'), ['participaciones', 'obras', 'organizaciones'])
  assert.deepEqual(ids('alterego'), ['produccion', 'dj', 'espacio'])
  assert.deepEqual(ids('soma'), ['produccion', 'meditacion', 'actividades', 'performance', 'bandas-en-vivo', 'dj', 'vj', 'otros'])
  assert.deepEqual(secciones('rama-cerratto').find((s) => s.id === 'participaciones')!.nodos.length, 15) // los 15 eventos, una vez cada uno
  assert.deepEqual(secciones('club-weyba').map((s) => s.id), ['eventos-producidos', 'integrantes'])
  // El área de Tropical y el menú de una entidad con áreas no usan secciones (D-24).
  assert.equal(padreDe(ady, id('obras'), 'ENTIDAD'), id('tropical-poncho'))
})

// D-46 / D-47: el portfolio de una persona sobre los CSV. `rol` son los chips; SOMA une el PRODUJO y el COLABORO_EN de Rama en una sola fila.
const portafolio = (slug: string, hoy?: string) => seccionesDe(ady, id(slug), vocab, hoy)
  .map((s) => `${s.label}: ` + s.nodos.map((q) => ady.nodos.get(q.id)!.label + (q.rol ? ` — ${q.rol}` : '')).join(' | '))

test('D-46: Rama Cerratto lee su portfolio; SOMA una vez, "Producción · DJ"', () => {
  assert.deepEqual(portafolio('rama-cerratto'), [
    'Participaciones: Alterego — Producción · DJ | Entropía — Producción · DJ · VJ | Anomalia — Producción · DJ | Punk Estelar — Producción · DJ | Punk Solar — Producción · DJ | ESPORA — Producción | Tropical Posporno: Distopia — Producción | C.E.P.A. — Producción | NUDO — Producción | SOMA — Producción · DJ | SOMA beta — Producción · DJ | Tropical Posporno — Producción | Tempistica II — Producción | Tempistica I — Producción · DJ | Kutral — Producción',
    'Obras: Entropía (Mapping) — Mapping',
    'Organizaciones: Tropical Poncho — Fundadxr',
  ])
})

test('D-47: con hoy = 2026-10-20 el único evento próximo de Rama y de Keuken Aonikenk es Alterego, arriba', () => {
  const p = seccionesDe(ady, id('rama-cerratto'), vocab, '2026-10-20').find((s) => s.id === 'participaciones')!
  assert.equal(p.proximos, 1); assert.equal(ady.nodos.get(p.nodos[0].id)!.label, 'Alterego')
  const e = seccionesDe(ady, id('keuken-aonikenk'), vocab, '2026-10-20').find((s) => s.id === 'eventos')!
  assert.equal(e.proximos, 1); assert.equal(ady.nodos.get(e.nodos[0].id)!.label, 'Alterego')
  assert.ok(!('proximos' in secciones('rama-cerratto')[0]))
})

test('D-46: personas de referencia, sección por sección (los números de 04.1-NEURONAS.md)', () => {
  assert.deepEqual(portafolio('luca-zisa'), [
    'Participaciones: Alterego — DJ | Punk Estelar — Producción · Live set | Punk Solar — Producción · Live set',
    'Organizaciones: Club Weyba — Fundadxr | Luca Zisa x Gaspar Fatum — Integra',
  ])
  assert.deepEqual(portafolio('juan-balladobres'), ['Participaciones: ESPORA — Live set · Charla', 'Organizaciones: Outro x Melodrumma — Integra | Sello Rojo — Integra'])
  assert.deepEqual(portafolio('laura-trotta'), [
    'Participaciones: Anomalia — Audiovisual', 'Organizaciones: Post.xno — Integra | Tropical Poncho — Trabajó en Comunicación', 'Colaboraciones: Agus Mansilla',
  ])
  assert.deepEqual(portafolio('melodrumma'), ['Participaciones: C.E.P.A. — Producción · Convocade', 'Organizaciones: Outro x Melodrumma — Integra'])
  assert.deepEqual(portafolio('julieta-agriano'), ['Participaciones: ESPORA — Charla', 'Organizaciones: WIP — Producción · Fundadxr'])
  assert.deepEqual(portafolio('rayo'), ['Participaciones: Tropical Posporno: Distopia — Convocade | Tropical Posporno — Invitade'])
  assert.deepEqual(portafolio('aggromance'), ['Participaciones: Anomalia — DJ'])
  assert.deepEqual(portafolio('rochi'), []); assert.deepEqual(portafolio('mailen-lazzarone'), [])
})

test('D-46: una organización lee Eventos producidos, Participaciones e Integrantes', () => {
  assert.deepEqual(portafolio('club-weyba'), ['Eventos producidos: Alterego | Luca Zisa en Ave Fenix', 'Integrantes: Luca Zisa — Fundadxr'])
  assert.deepEqual(portafolio('in-session'), ['Eventos producidos: SOMA', 'Integrantes: Fede Fragas | Luciano Rodriguez'])
  assert.equal(secciones('tropical-poncho').map((s) => `${s.label}(${s.nodos.length})`).join(', '), 'Eventos producidos(15), Participaciones(2), Integrantes(5)')
  // Integrantes: Rama, Mechi, Laura y, ex-integrantes sin fecha de salida todavía, Malvon Di Ritta y La Er (INTEGRA, 2026-10-20); el PRODUJO al revés Tropical -> Malvon está descartado.
  assert.deepEqual(portafolio('tropical-poncho').at(-1), 'Integrantes: La Er | Laura Trotta — Trabajó en Comunicación | Malvon Di Ritta | Mechi Botta — Producción | Rama Cerratto — Fundadxr')
  assert.deepEqual(portafolio('malvon-di-ritta').at(-1), 'Organizaciones: Post.xno — Fundadxr | Tropical Poncho — Integra')
  // Los dos COLABORO_EN sin rol de Tropical no se leen como producidos.
  const part = secciones('tropical-poncho').find((s) => s.id === 'participaciones')!.nodos.map((q) => ady.nodos.get(q.id)!.label).sort()
  assert.deepEqual(part, ['Concierto Público #4 ft Tropical Poncho', 'Luca Zisa en Ave Fenix'])
  assert.ok(secciones('tropical-poncho').find((s) => s.id === 'eventos-producidos')!.nodos.every((q) => !q.rol?.includes('Producción'))) // la sección ya lo dice
  // Su red sigue mostrando las 5 áreas en el menú (D-24): el portfolio es solo la ficha (04.1-09).
  assert.equal(agrupadoresDe(ady, id('tropical-poncho')).length, 5)
})

test('D-46: sin portfolio nada cambia (eventos, obras, lugares, bandas)', () => {
  assert.equal(secciones('tempistica-i').length, 14); assert.deepEqual(secciones('entropia-mapping').map((s) => s.id), ['mapping'])
  assert.deepEqual(secciones('espacio-ave-fenix').map((s) => s.id), ['eventos']); assert.deepEqual(secciones('cultura-del-sur'), [])
})

test('censo D-46: en toda entidad con portfolio ningún nodo se repite y ninguna contraparte de participación se pierde', () => {
  const PART = ['COLABORO_EN', 'CORREALIZO', 'PRODUJO', 'INTEGRA']
  let con = 0
  for (const n of nodos.filter((x) => x.nodeType === 'ENTIDAD' && ['persona', 'productora', 'colectivo', 'sello'].includes(x.subtipo))) {
    const ids = seccionesDe(ady, n.id, vocab).flatMap((s) => s.nodos.map((q) => q.id))
    const contrapartes = new Set(vinculos.filter((v) => PART.includes(v.tipoVinculo) && (v.origen === n.id || v.destino === n.id)).map((v) => (v.origen === n.id ? v.destino : v.origen)))
    assert.equal(new Set(ids).size, ids.length, `${n.label}: nodo repetido`)
    assert.deepEqual([...new Set(ids)].sort(), [...contrapartes].sort(), `${n.label}: contraparte perdida`)
    con++
  }
  assert.equal(con, 150)
})
