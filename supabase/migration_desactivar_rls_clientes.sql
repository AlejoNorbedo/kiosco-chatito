-- Las tablas clientes e historial_puntos solo son accesibles via API Routes del admin
-- (protegidas por cookie de sesión). No hay acceso público directo desde el frontend.
-- Deshabilitar RLS elimina el conflicto con el nuevo formato de keys de Supabase (sb_secret_*).
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE historial_puntos DISABLE ROW LEVEL SECURITY;
