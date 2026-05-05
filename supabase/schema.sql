-- Tabla de productos del kiosco
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio numeric(10, 2) not null check (precio >= 0),
  categoria text not null default 'General',
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Habilitar lectura pública (los clientes pueden ver productos sin login)
alter table productos enable row level security;

create policy "productos_lectura_publica"
  on productos for select
  using (activo = true);

-- Datos de ejemplo para arrancar
insert into productos (nombre, precio, categoria) values
  ('Coca-Cola 500ml', 1200, 'Bebidas'),
  ('Agua mineral 500ml', 700, 'Bebidas'),
  ('Sprite 500ml', 1200, 'Bebidas'),
  ('Alfajor Oreo', 900, 'Golosinas'),
  ('Alfajor Milka', 950, 'Golosinas'),
  ('Chicles Beldent', 500, 'Golosinas'),
  ('Papas Lay''s clásicas', 1500, 'Snacks'),
  ('Maní con chocolate', 800, 'Snacks'),
  ('Cigarrillos Marlboro', 3500, 'Cigarrillos'),
  ('Gifarro', 2800, 'Cigarrillos'),
  ('Diario La Nación', 600, 'Diarios'),
  ('Revista Gente', 1800, 'Revistas');
