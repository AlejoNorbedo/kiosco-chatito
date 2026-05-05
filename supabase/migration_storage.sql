-- Crear bucket público para imágenes de productos
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

-- Lectura pública para que las URLs de imagen funcionen sin auth
create policy "imagenes_lectura_publica"
  on storage.objects for select
  using (bucket_id = 'productos');

-- Las subidas se hacen desde la API route con service role key,
-- que bypasea RLS, por lo que no necesita política de INSERT adicional.
