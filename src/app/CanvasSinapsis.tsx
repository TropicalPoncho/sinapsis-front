'use client';

// Este es el único archivo que ve el framework de UI y el motor a la vez. Cualquier otro
// import de `src/engine/` desde `src/app/` es un defecto (invariante de CLAUDE.md).
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Fase } from './Overlay';
import type { Adyacencia } from '../lib/vista/adyacencia.ts';
import { resolverVista } from '../lib/vista/resolverVista.ts';
import type { IndiceSlugs } from '../lib/red/slugs.ts';
import { claveVista, vistaDe } from '../lib/red/url.ts';
import type { EstadoRed } from '../lib/red/url.ts';
import { LIMITE_HOME, fraccionHome, semillaDeVisita } from '../lib/red/home.ts';
import type { Subgrafo, Transicion } from '../types/vista.ts';

interface Props {
  ady: Adyacencia | null;
  idx: IndiceSlugs | null;
  estado: EstadoRed;
  llegadaRef: RefObject<{ t: Transicion }>;
  panelRef: RefObject<HTMLElement | null>;
  onFase: (f: Fase) => void;
  onNodoClick: (id: string) => void;
  onEngineReady?: (engine: unknown) => void;
}

interface Tarea { sub: Subgrafo; enfocadoId: string | null; transicion: Transicion }

const limiteDe = () => {
  const n = Number(new URLSearchParams(window.location.search).get('limite'));
  return Number.isInteger(n) && n >= 5 && n <= 200 ? n : LIMITE_HOME;
};

const pausa = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

export default function CanvasSinapsis({ ady, idx, estado, llegadaRef, panelRef, onFase, onNodoClick, onEngineReady }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // ponytail: `any` para el motor es deliberado — el motor es JS y `allowJs` infiere suelto.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const motorListo = useRef<Promise<any>>(Promise.resolve(null));
  const resolverMotor = useRef<(e: unknown) => void>(() => {});
  const onClickRef = useRef(onNodoClick);
  const onEngineReadyRef = useRef(onEngineReady);
  const hayFocoRef = useRef(false);
  const enCurso = useRef<Promise<void>>(Promise.resolve());
  const pendiente = useRef<Tarea | null>(null);
  const ultimaClave = useRef<string | null>(null);
  const ultimaVista = useRef<string | null>(null);
  const panelVisible = useRef(false);

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
          if (!hayFocoRef.current || !panelRef.current) return sin;
          const r = panelRef.current.getBoundingClientRect();
          return window.innerWidth >= 800
            ? { ...sin, left: r.right }
            : { ...sin, bottom: Math.max(0, window.innerHeight - r.top) };
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
  }, [panelRef]);

  // Effect 2: navegación — sigue la URL, secuencia Vista, cámara, overlay.
  useEffect(() => {
    if (!ady || !idx) return;
    const redId = estado.red ? idx.idPorSlug.get(estado.red) ?? null : null;
    const enfocadoId = estado.enfocado ? idx.idPorSlug.get(estado.enfocado) ?? null : null;
    const tipo = (id: string | null) => (id ? ady.nodos.get(id)?.nodeType : undefined);
    // Entrar (red === enfocado, salvo obra/evento): se encuadra toda la red, sin foco ni panel.
    const entrado = redId !== null && redId === enfocadoId && tipo(redId) !== 'OBRA' && tipo(redId) !== 'EVENTO';

    const cvVista = claveVista(estado);
    const clave = cvVista + '|' + (estado.enfocado ?? '');
    if (clave === ultimaClave.current) return; // cubre el doble effect de StrictMode

    let sub: Subgrafo = redId === null
      ? fraccionHome(ady, { semilla: estado.semilla ?? semillaDeVisita(), limite: limiteDe() })
      : resolverVista(ady, vistaDe(estado, redId, tipo(redId)));
    if (enfocadoId && !sub.nodos.some(n => n.id === enfocadoId)) {
      // El enfocado no está en la Vista: se mira la red del propio enfocado.
      sub = resolverVista(ady, vistaDe({ ...estado, red: estado.enfocado }, enfocadoId, tipo(enfocadoId)));
    }
    hayFocoRef.current = enfocadoId !== null && !entrado;

    const primera = ultimaClave.current === null;
    const transicion: Transicion = primera ? 'reemplazo'
      : cvVista === ultimaVista.current ? 'aditivo' // solo cambió el foco: nada entra ni sale
      : llegadaRef.current.t;
    ultimaClave.current = clave;
    ultimaVista.current = cvVista;

    // ponytail: la cola descarta intermedias (la URL ya quedó bien, es la fuente de verdad);
    // atrás con filtrado<->aditivo no restaura posiciones.
    pendiente.current = { sub, enfocadoId: entrado ? null : enfocadoId, transicion };
    enCurso.current = enCurso.current.then(async () => {
      const p = pendiente.current;
      pendiente.current = null;
      if (!p) return;
      try {
        onFase(primera ? 'cargando' : 'moviendo');
        if (panelVisible.current) {
          // sale el panel antes de mover la cámara
          await pausa(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
        }
        if (primera) { await frame(); await frame(); } // pintar el loader antes de warmupTicks
        const engine = await motorListo.current;
        await engine.setVista(p.sub, { transicion: p.transicion, nodoEnfocado: p.enfocadoId });
      } catch (e) {
        console.error(e);
      }
      // solo si nadie encoló durante el movimiento
      if (pendiente.current === null) { panelVisible.current = p.enfocadoId !== null; onFase('listo'); }
    });
  }, [ady, idx, estado, llegadaRef, onFase]);

  return <div ref={ref} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />;
}
