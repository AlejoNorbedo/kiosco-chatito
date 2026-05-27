ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS suma_puntos boolean DEFAULT true;
