-- Puntos generados por pedido (para poder restarlos si se cancela)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS puntos_generados integer NOT NULL DEFAULT 0;

-- Historial de movimientos de puntos por cliente
CREATE TABLE IF NOT EXISTS historial_puntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  concepto text NOT NULL,
  puntos integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE historial_puntos ENABLE ROW LEVEL SECURITY;

-- Políticas explícitas para service_role (mismo patrón que tabla clientes)
CREATE POLICY "service_role_all_historial" ON historial_puntos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
