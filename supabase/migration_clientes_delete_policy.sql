-- Política DELETE faltante para service_role en tabla clientes.
-- Sin esta política, el borrado falla silenciosamente cuando el bypass
-- automático de RLS no es confiable con el formato de keys sb_secret_*.
CREATE POLICY "service_role_delete_clientes" ON clientes
  FOR DELETE TO service_role USING (true);
