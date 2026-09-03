-- ============================================================================
-- Consulta de puntos por parte del cliente
--
-- El cliente escribe su teléfono distinto cada vez y se guarda tal cual lo
-- tipeó en el checkout, así que buscar por igualdad exacta falla casi siempre
-- (y por eso pueden existir clientes duplicados con el mismo número escrito de
-- dos formas):
--
--     2227541859        +54 222 754-1859        0222 754-1859
--     (222) 754 1859    +54 9 222 7541859       222 15 754 1859
--
-- Quedarse con los últimos 10 dígitos resuelve todos los casos de prefijo —
-- el 54 del país, el 9 de celular y el 0 de larga distancia van todos adelante,
-- y 10 dígitos es el largo de un número argentino completo (área + abonado).
--
-- El "15" es el único que no cae acá porque va en el medio, después del código
-- de área. Ese caso se cubre del lado de la API, que prueba varias formas del
-- número que le escriben.
--
-- Es idempotente: se puede correr de nuevo sin problema. La columna es
-- generada, así que borrarla y recrearla no pierde ningún dato.
-- ============================================================================

ALTER TABLE clientes DROP COLUMN IF EXISTS telefono_digitos;

ALTER TABLE clientes
  ADD COLUMN telefono_digitos text
  GENERATED ALWAYS AS (right(regexp_replace(telefono, '\D', '', 'g'), 10)) STORED;

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
