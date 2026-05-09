-- Función SECURITY DEFINER: corre como el owner de la función (postgres/superusuario),
-- bypaseando RLS completamente. Necesario porque el cliente JS de Supabase tiene
-- problemas ejecutando DELETE con RLS incluso con políticas explícitas para service_role.
CREATE OR REPLACE FUNCTION public.eliminar_cliente(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM historial_puntos WHERE cliente_id = p_id;
  DELETE FROM clientes WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.eliminar_cliente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_cliente(uuid) TO service_role;
