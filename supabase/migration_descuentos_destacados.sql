ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_oferta numeric(10,2) DEFAULT null CHECK (precio_oferta IS NULL OR precio_oferta >= 0),
  ADD COLUMN IF NOT EXISTS destacado boolean DEFAULT false;
