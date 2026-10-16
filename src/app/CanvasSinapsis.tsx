'use client';

// Este es el único archivo que ve el framework de UI y el motor a la vez. Cualquier otro
// import de `src/engine/` desde `src/app/` es un defecto (invariante de CLAUDE.md).
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Fase } from './Overlay';
import type { Adyacencia } from '../lib/vista/adyacencia.ts';
import type { IndiceSlugs } from '../lib/red/slugs.ts';
import { claveEstado, claveVista } from '../lib/red/url.ts';
import type { EstadoRed, subgrafoDe } from '../lib/red/url.ts';
import type { Subgrafo, Transicion } from '../types/vista.ts';

interface Props {
  ady: Adyacencia | null;
  idx: IndiceSlugs | null;
  estado: EstadoRed;
  // Lo visible, calculado por el Shell (la Vista de la URL más lo sumado al recorrer, D-22).
  escena: ReturnType<typeof subgrafoDe> | null;
  llegadaRef: RefObject<{ t: Transicion }>;
  panelRef: RefObject<HTMLElement | null>;
  tituloRef: RefObject<HTMLHeadingElement | null>;
  onFase: (f: Fase) => void;
  onMostrar: (e: EstadoRed) => void;
  onNodoClick: (id: string) => void;
  onEngineReady?: (engine: unknown) => void;
}

interface Tarea { sub: Subgrafo; enfocadoId: string | null; transicion: Transicion; estado: EstadoRed }

const pausa = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

export default function CanvasSinapsis({ ady, idx, estado, escena, llegadaRef, panelRef, tituloRef, onFase, onMostrar, onNodoClick, onEngineReady }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // ponytail: `any` para el motor es deliberado — el motor es JS y `allowJs` infiere suelto.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const motorListo = useRef<Promise<any>>(Promise.resolve(null));
  const resolverMotor = useRef<(e: unknown) => void>(() => {});
  const onClickRef = useRef(onNodoClick);
  const onEngineReadyRef = useRef(onEngineReady);
  const enCurso = useRef<Promise<void>>(Promise.resolve());
  const pendiente = useRef<Tarea | null>(null);
  const ultimaClave = useRef<string | null>(null);
  const ultimaVista = useRef<string | null>(null);
  const panelVisible = useRef(false);
  // Lo que el motor tiene en escena y el estado que se le mandó por última vez: se actualizan al
  // desencolar, porque la cola descarta intermedias y lo que importa es lo que el motor tiene.
  const idsEnEscena = useRef<Set<string>>(new Set());
  const ultimoEnviado = useRef<string | null>(null);

  useEffect(() => { onClickRef.current = onNodoClick; });
  useEffect(() => { onEngineReadyRef.current = onEngineReady; });

  // Effect 1: ciclo de vida, StrictMode-safe.
  useEffect(() => {
    let vivo = true;
    // Promesa nueva por montaje: StrictMode destruye y recrea el motor.
    motorListo.current = new Promise(r => { resolverMotor.current = r; });
    const unsub: (() => void)[] = [];
    let timer: ReturnType<typeof setInterval> | undefined;

    (async () => {
      const [{ SinapsisEngine }, { GLOBAL_DEFAULT_SETTINGS: ajustes }] = await Promise.all([
        import('../engine/SinapsisEngine.js'),
        import('../engine/graph/constants.js'),
      ]);
      const params = new URLSearchParams(window.location.search);
      const num = (k: string) => (params.has(k) ? Number(params.get(k)) : undefined);
      if (num('dist') !== undefined) ajustes.linkDistance = num('dist')!;
      if (num('grado') !== undefined) ajustes.linkDistanciaPorGrado = num('grado')!;

      // Sin ningún await entre este chequeo y el constructor.
      if (!vivo || !ref.current) return;
      const engine = new SinapsisEngine(ref.current, {
        getAreaSegura: () => {
          const sin = { top: 0, right: 0, bottom: 0, left: 0 };
          if (!panelRef.current) return sin; // siempre el rect del panel: el motor decide cuándo aplicarlo (_nodoEnfocado)
          const r = panelRef.current.getBoundingClientRect();
          // El puente le pasa al motor todo lo que tapa el canvas: el título grande de mobile tapa arriba.
          return window.innerWidth >= 800
            ? { ...sin, left: r.right }
            : { ...sin, top: tituloRef.current?.getBoundingClientRect().bottom ?? 0, bottom: Math.max(0, window.innerHeight - r.top) };
        },
        charge: num('charge'),
        escalaNodos: num('escala'),
        forceEngine: params.get('engine') ?? undefined,
      });
      engineRef.current = engine;
      resolverMotor.current(engine);
      onEngineReadyRef.current?.(engine);

      unsub.push(engine.on('nodeClick', (n: { id: string }) => onClickRef.current(n.id)));
      // Marca de "la red ya es visible": el LCP del navegador mide el título, no el WebGL.
      unsub.push(engine.on('vistaLista', () => { performance.mark('sinapsis:vistaLista'); }));
      // No suscribirse a nodeFocus: ~60/s.

      if (params.get('perf') === '1') {
        (window as unknown as { __sinapsis: unknown }).__sinapsis = engine;
        timer = setInterval(() => console.log('perf', engine._perf()), 2000);
      }
    })();

    return () => {
      vivo = false;
      unsub.forEach(f => f());
      if (timer) clearInterval(timer);
      engineRef.current?.destruir();
      engineRef.current = null;
      onEngineReadyRef.current?.(null);
    };
  }, [panelRef, tituloRef]);

  // Effect 2: navegación — sigue la URL, secuencia Vista, cámara, overlay.
  useEffect(() => {
    if (!ady || !idx || !escena) return;
    const redId = estado.red ? idx.idPorSlug.get(estado.red) ?? null : null;
    const enfocadoId = estado.enfocado ? idx.idPorSlug.get(estado.enfocado) ?? null : null;
    const tipo = (id: string | null) => (id ? ady.nodos.get(id)?.nodeType : undefined);
    // Entrar (red === enfocado, salvo obra/evento): se encuadra toda la red, sin foco ni panel.
    const entrado = redId !== null && redId === enfocadoId && tipo(redId) !== 'OBRA' && tipo(redId) !== 'EVENTO';

    const cvVista = claveVista(estado);
    // Lo sumado puede cambiar sin que cambie la URL.
    const clave = claveEstado(estado) + '|' + escena.sumados.join(',');
    if (clave === ultimaClave.current) return; // cubre el doble effect de StrictMode
    const sub = escena.sub;

    const primera = ultimaClave.current === null;
    const transicion: Transicion = primera ? 'reemplazo'
      : cvVista === ultimaVista.current ? 'aditivo' // solo cambió el foco: nada entra ni sale
      : llegadaRef.current.t;
    ultimaClave.current = clave;
    ultimaVista.current = cvVista;

    // ponytail: la cola descarta intermedias (la URL ya quedó bien, es la fuente de verdad);
    // atrás con filtrado<->aditivo no restaura posiciones.
    pendiente.current = { sub, enfocadoId: entrado ? null : enfocadoId, transicion, estado };
    enCurso.current = enCurso.current.then(async () => {
      const p = pendiente.current;
      pendiente.current = null;
      if (!p) return;
      // Solo cambió lo sumado (la URL es la misma que ya tiene el motor): no se mueve la cámara ni
      // se toca el panel, su contenido no cambia.
      const claveP = claveEstado(p.estado);
      const soloSuma = claveP === ultimoEnviado.current;
      // ponytail: la intención de navegación elige la transición; el puente solo corrige el pedido
      // imposible. El motor en aditivo nunca quita: si algo de la escena ya no está, es filtrado.
      const nuevos = new Set(p.sub.nodos.map(n => n.id));
      let transicion: Transicion = soloSuma ? 'aditivo' : p.transicion;
      if (transicion === 'aditivo' && [...idsEnEscena.current].some(id => !nuevos.has(id))) transicion = 'filtrado';
      idsEnEscena.current = nuevos;
      ultimoEnviado.current = claveP;
      try {
        if (!soloSuma) onFase(primera ? 'cargando' : 'moviendo');
        if (!soloSuma && panelVisible.current) {
          // el panel sale con el contenido viejo antes de que cambie nada (misma duración que el CSS)
          await pausa(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 300);
        }
        if (primera) { await frame(); await frame(); } // pintar el loader antes de warmupTicks
        if (!soloSuma && p.enfocadoId) {
          // ya oculto: el contenido nuevo se pinta (invisible) y el rect del panel queda medido
          // antes de que el motor lo lea para encuadrar
          onMostrar(p.estado);
          await frame(); await frame();
        }
        const engine = await motorListo.current;
        await engine.setVista(p.sub, { transicion, nodoEnfocado: soloSuma ? undefined : p.enfocadoId });
      } catch (e) {
        console.error(e);
      }
      // sin foco: el contenido se vacía recién cuando la cámara ya soltó el foco
      if (soloSuma) return;
      if (!p.enfocadoId) onMostrar(p.estado);
      // solo si nadie encoló durante el movimiento
      if (pendiente.current === null) { panelVisible.current = p.enfocadoId !== null; onFase('listo'); }
    });
  }, [ady, idx, estado, escena, llegadaRef, onFase, onMostrar]);

  return <div ref={ref} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />;
}
