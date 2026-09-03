-- ============================================================================
-- Punto de venta (POS) — ventas presenciales en el mostrador
--
-- Las ventas del mostrador se guardan en la misma tabla `pedidos` que las de
-- WhatsApp: así comparten stock, cierre de caja y fidelización, que es todo el
-- punto de unificarlas. La columna `canal` es lo único que las distingue.
--
-- Los pedidos que ya existen quedan como 'whatsapp', que es lo que eran.
-- ============================================================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS canal text NOT NULL DEFAULT 'whatsapp';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_canal_valido'
  ) THEN
    ALTER TABLE pedidos
      ADD CONSTRAINT pedidos_canal_valido CHECK (canal IN ('whatsapp', 'presencial'));
  END IF;
END
$$;

-- El cierre de caja agrupa por canal dentro de un rango de fechas.
CREATE INDEX IF NOT EXISTS idx_pedidos_canal_fecha ON pedidos (canal, created_at DESC);

-- ============================================================================
-- El aviso de pedido nuevo es solo para lo que entra por WhatsApp.
--
-- Sin este cambio, cobrar en el mostrador dispararía el sonido y el toast en el
-- panel: el kiosquero se avisaría a sí mismo de la venta que acaba de cargar.
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_avisar_pedido_nuevo ON pedidos;
CREATE TRIGGER trigger_avisar_pedido_nuevo
  AFTER INSERT ON pedidos
  FOR EACH ROW
  WHEN (NEW.canal = 'whatsapp')
  EXECUTE FUNCTION public.avisar_pedido_nuevo();
