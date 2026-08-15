import CanvasSinapsis from './CanvasSinapsis';

// ponytail: ruta placeholder. El montaje definitivo del canvas es en layout.tsx, por encima
// del router — eso es UI-08 en la Fase 4. Acá sólo se monta para poder ver el fixture.
export default function IndexPage() {
  return (
    <>
      <CanvasSinapsis />
      <h1 className="floatingTitle">TROPICAL PONCHO</h1>
    </>
  );
}
