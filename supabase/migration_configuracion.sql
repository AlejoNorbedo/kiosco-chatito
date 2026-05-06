-- Tabla de configuración del kiosco (fila única con id=1)
CREATE TABLE IF NOT EXISTS configuracion (
  id integer PRIMARY KEY DEFAULT 1,
  costo_envio integer NOT NULL DEFAULT 0,
  tiempo_entrega_activo boolean NOT NULL DEFAULT false,
  tiempo_entrega_texto text NOT NULL DEFAULT '30-45 minutos',
  telefono_requerido boolean NOT NULL DEFAULT false,
  CHECK (id = 1)
);

INSERT INTO configuracion (id, costo_envio, tiempo_entrega_activo, tiempo_entrega_texto, telefono_requerido)
VALUES (1, 0, false, '30-45 minutos', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura_publica_config" ON configuracion
  FOR SELECT TO anon USING (true);

-- Agregar campo para guardar datos del cliente junto al pedido
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS datos_cliente jsonb;

-- Monto mínimo de pedido
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS monto_minimo integer NOT NULL DEFAULT 0;
