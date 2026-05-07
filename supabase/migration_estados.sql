-- Agregar columna estado a la tabla pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente'
  CHECK (estado IN ('pendiente', 'confirmado', 'cancelado'));

-- Actualizar pedidos existentes sin estado
UPDATE pedidos SET estado = 'pendiente' WHERE estado IS NULL;
