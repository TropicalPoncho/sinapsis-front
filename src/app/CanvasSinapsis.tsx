'use client';

// Este es el único archivo que ve el framework de UI y el motor a la vez. Cualquier otro
// import de `src/engine/` desde `src/app/` es un defecto (invariante de CLAUDE.md).
import { useEffect, useRef } from 'react';

export default function CanvasSinapsis() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    // ponytail: `any` para el motor es deliberado — el motor es JS y `allowJs` infiere
    // suelto. Si la superficie crece, un `.d.ts` a mano al lado del motor; hoy son dos métodos.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let engine: any;

    // MOTR-08: rect de desarrollo por breakpoint. En la Fase 4 lo reemplaza el rect real del
    // panel, medido con getBoundingClientRect en cada frame de scroll — el motor ya lo lee
    // cuadro a cuadro, este archivo sólo cambia de dónde sale el valor.
    const getAreaSegura = () =>
      window.innerWidth >= 800
        ? { top: 0, right: 0, bottom: 0, left: 0.62 * window.innerWidth }
        : { top: 0, right: 0, bottom: 0.6 * window.innerHeight, left: 0 };

    // Import dinámico para que el módulo del motor nunca se evalúe en el servidor (SSR).
    (async () => {
      const { SinapsisEngine } = await import('../engine/SinapsisEngine.js');
      const { subgrafoDemo, subgrafoDemoFiltrado } = await import('../engine/fixtures/subgrafoDemo.js');
      if (!vivo || !ref.current) return;

      const params = new URLSearchParams(window.location.search);

      // Rig de medición de PERF-01, detrás de query params — no es UI, es el aparato de
      // medición. El panel real con su degradado (?overlay=1 acá) es UI-09 en la Fase 4.
      if (params.get('overlay') === '1') {
        const tapa = document.createElement('div');
        tapa.style.cssText = 'position:fixed;inset:0 38% 0 0;background:#000;z-index:1';
        document.body.appendChild(tapa);
      }

      // Perillas de tuning visual por URL (?dist=&grado=&charge=&escala=), sin tocar código:
      // dist/grado pisan las constantes del motor, charge y escala entran como opciones.
      const num = (k: string) => (params.has(k) ? Number(params.get(k)) : undefined);
      const { GLOBAL_DEFAULT_SETTINGS: ajustes } = await import('../engine/graph/constants.js');
      if (num('dist') !== undefined) ajustes.linkDistance = num('dist')!;
      if (num('grado') !== undefined) ajustes.linkDistanciaPorGrado = num('grado')!;

      engine = new SinapsisEngine(ref.current, { getAreaSegura, charge: num('charge'), escalaNodos: num('escala') });
      // MOTR-12: log del punto proyectado — verificación manual (c) del Plan 05, no UI real.
      engine.on('nodeFocus', (f: { nodeId: string; screen: { x: number; y: number } }) => console.log('nodeFocus', f));

      // Marca de "la red ya es visible": el LCP del navegador mide el título, no el WebGL.
      // startTime es ms desde el inicio de la navegación; también visible en DevTools > Performance > Timings.
      engine.on('vistaLista', () => {
        const { startTime } = performance.mark('sinapsis:vistaLista');
        if (params.get('perf') === '1') {
          console.log('perf vistaLista (ms desde navegación)', Math.round(startTime));
          console.table(performance.getEntriesByType('mark').filter(m => m.name.startsWith('sinapsis:')).map(m => ({ marca: m.name, ms: Math.round(m.startTime) })));
        }
      });

      // Depuración desde la consola / herramientas: el motor queda accesible sólo con ?perf=1.
      if (params.get('perf') === '1') (window as unknown as { __sinapsis: unknown }).__sinapsis = engine;
      if (params.get('perf') === '1') {
        setInterval(() => console.log('perf', engine._perf()), 2000);
      }

      const nodosParam = params.get('nodos');
      const vista = nodosParam
        ? (await import('../engine/fixtures/subgrafoSintetico.js')).subgrafoSintetico(Number(nodosParam), {
            topologia: params.get('topologia') === 'hubs' ? 'hubs' : 'cadena',
            enlacesPorNodo: Number(params.get('enlaces') ?? 1.5),
            forma: params.get('forma') ?? '',
          })
        : subgrafoDemo;
      const foco = params.get('foco') ?? undefined;
      await engine.setVista(vista, { transicion: 'reemplazo', nodoEnfocado: foco });

      // Checklist punto 10 (MOTR-07): con ?nodos=800&demo=liberacion, reemplaza la red grande por
      // la demo de 12 nodos y loguea geometrías/texturas antes y después. Aparato de medición.
      if (vivo && params.get('demo') === 'liberacion') {
        const antes = engine._perf();
        await engine.setVista(subgrafoDemo, { transicion: 'reemplazo' });
        setTimeout(() => console.table({ antes, despues: engine._perf() }), 1000);
      }

      // ponytail: secuencia de verificación manual de las tres transiciones (Plan 04, Task 2),
      // detrás de ?demo=transiciones para que no corra en cada carga. Se retira cuando el
      // Plan 06 tenga su propia checklist visual.
      if (vivo && params.get('demo') === 'transiciones') {
        type P = { id: string; x: number; y: number; z: number };
        const pausa = () => new Promise(r => setTimeout(r, 3000)); // para poder mirar cada paso
        const snapshot = () => new Map((engine.graph.graphData().nodes as P[]).map(n => [n.id, { x: n.x, y: n.y, z: n.z }]));
        // Cuántos nodos que ya estaban se movieron: el veredicto de filtrado/aditivo (0 = OK).
        const movidos = (antes: Map<string, { x: number; y: number; z: number }>) =>
          (engine.graph.graphData().nodes as P[]).filter(n => {
            const a = antes.get(n.id);
            return a && (Math.abs(a.x - n.x) > 0.01 || Math.abs(a.y - n.y) > 0.01 || Math.abs(a.z - n.z) > 0.01);
          }).length;

        await pausa();
        const antesFiltrado = snapshot();
        await engine.setVista(subgrafoDemoFiltrado, { transicion: 'filtrado' });
        console.log(`FILTRADO: ${movidos(antesFiltrado)} nodos que seguían se movieron (esperado: 0)`);
        await pausa();
        const antesAditivo = snapshot();
        await engine.setVista(subgrafoDemo, { transicion: 'aditivo' });
        console.log(`ADITIVO: ${movidos(antesAditivo)} nodos que ya estaban se movieron (esperado: 0)`);
      }

      // Click = foco (hasta que la Fase 4 lo cambie por navegación de ruta): el motor sólo emite
      // nodeClick; el puente decide qué hacer y le pide el foco vía setVista.
      engine.on('nodeClick', (n: { id: string }) => engine.setVista(vista, { transicion: 'aditivo', nodoEnfocado: n.id }));
    })();

    return () => {
      vivo = false;
      engine?.destruir();
    };
  }, []);

  return <div ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />;
}
