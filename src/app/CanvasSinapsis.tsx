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
      engine = new SinapsisEngine(ref.current, { getAreaSegura });
      // MOTR-12: log del punto proyectado — verificación manual (c) del Plan 05, no UI real.
      engine.on('nodeFocus', (f: { nodeId: string; screen: { x: number; y: number } }) => console.log('nodeFocus', f));
      const foco = new URLSearchParams(window.location.search).get('foco') ?? undefined;
      await engine.setVista(subgrafoDemo, { transicion: 'reemplazo', nodoEnfocado: foco });

      // ponytail: secuencia de verificación manual de las tres transiciones (Plan 04, Task 2),
      // detrás de ?demo=transiciones para que no corra en cada carga. Se retira cuando el
      // Plan 06 tenga su propia checklist visual.
      if (vivo && new URLSearchParams(window.location.search).get('demo') === 'transiciones') {
        const antes = new Map(
          engine.graph.graphData().nodes.map((n: { id: string; x: number; y: number; z: number }) => [n.id, { x: n.x, y: n.y, z: n.z }])
        );
        await engine.setVista(subgrafoDemoFiltrado, { transicion: 'filtrado' });
        const despues = engine.graph.graphData().nodes as { id: string; x: number; y: number; z: number }[];
        console.table(
          despues
            .filter(n => antes.has(n.id))
            .map(n => ({ id: n.id, ...antes.get(n.id)!, xDespues: n.x, yDespues: n.y, zDespues: n.z }))
        );
        await engine.setVista(subgrafoDemo, { transicion: 'aditivo' });
      }
    })();

    return () => {
      vivo = false;
      engine?.destruir();
    };
  }, []);

  return <div ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />;
}
