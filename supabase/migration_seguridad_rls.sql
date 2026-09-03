-- ============================================================================
-- Cierra el acceso público a los datos que no deben leerse con la anon key.
--
-- La anon key viaja en el bundle del navegador, así que todo lo que ella pueda
-- leer es público de hecho. Antes de esta migración:
--
--   * `pedidos` tenía SELECT e INSERT abiertos → cualquiera podía listar los
--     nombres, direcciones y teléfonos de todos los pedidos, y podía insertar
--     un pedido con el total que quisiera.
--   * `clientes` e `historial_puntos` tenían RLS DESACTIVADO → la anon key
--     leía y escribía toda la base de fidelización.
--
-- Ahora el alta de pedidos pasa por POST /api/pedidos, que usa la service role
-- y recalcula precios y puntos contra la base. El navegador no necesita ningún
-- permiso directo sobre estas tablas.
--
-- Con RLS activo y sin políticas, `anon` queda sin acceso; `service_role` sigue
-- entrando porque tiene BYPASSRLS. Por eso también se borran las políticas
-- "TO service_role": nunca hicieron falta.
--
-- Correr entera en el SQL Editor de Supabase.
-- ============================================================================

-- ── pedidos ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pedidos_insertar" ON pedidos;
DROP POLICY IF EXISTS "pedidos_leer" ON pedidos;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- ── clientes ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_select_clientes" ON clientes;
DROP POLICY IF EXISTS "service_role_insert_clientes" ON clientes;
DROP POLICY IF EXISTS "service_role_update_clientes" ON clientes;
DROP POLICY IF EXISTS "service_role_delete_clientes" ON clientes;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- ── historial_puntos ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_all_historial" ON historial_puntos;
ALTER TABLE historial_puntos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Avisos de pedido nuevo
--
-- El panel admin escuchaba los INSERT de `pedidos` por realtime con la anon
-- key. Al cerrar esa tabla, realtime deja de mandarle eventos (aplica RLS).
-- Esta tabla auxiliar guarda solo el id del pedido: alcanza para disparar el
-- sonido y el toast, y no expone ningún dato del cliente. El panel usa el id
-- para pedir el pedido completo a /api/admin/pedidos, que sí está protegida.
-- ============================================================================

CREATE TABLE IF NOT EXISTS avisos_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE avisos_pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avisos_leer" ON avisos_pedidos;
CREATE POLICY "avisos_leer" ON avisos_pedidos FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.avisar_pedido_nuevo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO avisos_pedidos (pedido_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_avisar_pedido_nuevo ON pedidos;
CREATE TRIGGER trigger_avisar_pedido_nuevo
  AFTER INSERT ON pedidos
  FOR EACH ROW EXECUTE FUNCTION public.avisar_pedido_nuevo();

-- Realtime: ahora se escucha `avisos_pedidos` en lugar de `pedidos`.
-- El guard permite volver a correr la migración sin que falle.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'avisos_pedidos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE avisos_pedidos;
  END IF;
END
$$;

-- ============================================================================
-- Verificación (opcional). Las cuatro tablas deben dar rowsecurity = true.
-- ============================================================================
-- SELECT relname, relrowsecurity
--   FROM pg_class
--  WHERE relname IN ('pedidos', 'clientes', 'historial_puntos', 'avisos_pedidos');
--
-- `pedidos`, `clientes` e `historial_puntos` deben quedar con 0 políticas:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
