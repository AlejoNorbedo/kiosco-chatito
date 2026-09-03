-- ============================================================================
-- Consulta de puntos por parte del cliente
--
-- El cliente escribe su teléfono para ver su saldo, pero lo escribe distinto
-- cada vez: "11 1234-5678", "1112345678", "+54 9 11 1234 5678". Se guarda tal
-- cual lo tipeó en el checkout, así que buscar por igualdad exacta fallaría
-- casi siempre (y por eso hoy pueden existir clientes duplicados con el mismo
-- número escrito de dos formas).
--
-- Esta columna generada guarda solo los dígitos y se mantiene sola: no hay que
-- migrar los datos existentes ni tocar el código que inserta clientes.
-- ============================================================================

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS telefono_digitos text
  GENERATED ALWAYS AS (regexp_replace(telefono, '\D', '', 'g')) STORED;

CREATE INDEX IF NOT EXISTS idx_clientes_telefono_digitos
  ON clientes (telefono_digitos);

-- Ver si quedaron clientes duplicados por formato del teléfono.
-- Si devuelve filas, conviene unificarlos a mano desde la pestaña Clientes.
--
-- SELECT telefono_digitos,
--        count(*) AS registros,
--        array_agg(telefono) AS como_se_escribieron,
--        sum(puntos_acumulados - puntos_canjeados) AS puntos_totales
--   FROM clientes
--  WHERE telefono_digitos <> ''
--  GROUP BY telefono_digitos
-- HAVING count(*) > 1;
