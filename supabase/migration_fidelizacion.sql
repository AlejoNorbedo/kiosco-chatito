-- Tabla clientes para sistema de fidelización
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono text NOT NULL UNIQUE,
  nombre text NOT NULL,
  puntos_acumulados integer NOT NULL DEFAULT 0,
  puntos_canjeados integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Políticas explícitas para service_role (necesario con el nuevo formato de keys de Supabase)
-- El bypass automático de RLS no es confiable con sb_publishable_* / sb_secret_*
CREATE POLICY "service_role_select_clientes" ON clientes
  FOR SELECT TO service_role USING (true);

CREATE POLICY "service_role_insert_clientes" ON clientes
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_role_update_clientes" ON clientes
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Nuevos campos en configuracion para fidelización
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS puntos_por_monto integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puntos_para_canje integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mensaje_canje text NOT NULL DEFAULT '';
