-- Recargo por transferencia
-- Correr en Supabase SQL Editor

-- 1. Flag por producto: si este producto tiene recargo cuando se paga con transferencia
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS recargo_transferencia boolean DEFAULT false;

-- 2. Porcentaje de recargo global en configuracion
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS recargo_transferencia_pct integer DEFAULT 0;

-- 3. Habilitar realtime para la tabla productos (necesario para auto-actualización en la app pública)
ALTER PUBLICATION supabase_realtime ADD TABLE productos;
