ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS horario_activo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS horario_apertura text DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS horario_cierre text DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS dias_activos integer[] DEFAULT '{0,1,2,3,4,5,6}';
