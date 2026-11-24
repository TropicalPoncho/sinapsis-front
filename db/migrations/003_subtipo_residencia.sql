-- 003_subtipo_residencia.sql — subtipo de EVENTO para Ryzomatica (quick 261124-ryz).
--
-- El vocabulario de subtipos es abierto: sumar uno es un INSERT (001). Sin esta fila, el import de
-- data/curaduria/nodos.csv falla contra la FK nodos.subtipo -> subtipos.codigo en la fila de Ryzomatica,
-- así que se corre en Neon ANTES de `npm run migracion:importar`. Aditiva e idempotente.
INSERT INTO subtipos (codigo, node_type, label) VALUES
  ('residencia', 'EVENTO', 'Residencia')
ON CONFLICT (codigo) DO NOTHING;
