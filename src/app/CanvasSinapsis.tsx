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

    // Import dinámico para que el módulo del motor nunca se evalúe en el servidor (SSR).
    (async () => {
      const { SinapsisEngine } = await import('../engine/SinapsisEngine.js');
      const { subgrafoDemo } = await import('../engine/fixtures/subgrafoDemo.js');
      if (!vivo || !ref.current) return;
      engine = new SinapsisEngine(ref.current);
      await engine.setVista(subgrafoDemo, { transicion: 'reemplazo' });
    })();

    return () => {
      vivo = false;
      engine?.destruir();
    };
  }, []);

  return <div ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />;
}
