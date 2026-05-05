-- Agregar stock a productos
alter table productos add column if not exists stock integer not null default 0;

-- Tabla de pedidos
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null,
  total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

alter table pedidos enable row level security;

-- Clientes pueden insertar pedidos
create policy "pedidos_insertar"
  on pedidos for insert
  with check (true);

-- Lectura libre (el admin la usa con la misma anon key)
create policy "pedidos_leer"
  on pedidos for select
  using (true);

-- Actualizar stock de ejemplo
update productos set stock = 20 where activo = true;
