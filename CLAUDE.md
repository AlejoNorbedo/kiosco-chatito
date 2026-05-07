# Kiosco Chatito — App Web

App web para el kiosco de barrio "Kiosco Chatito". Permite a los clientes ver el catálogo, armar un carrito con checkout completo y enviar el pedido por WhatsApp. El dueño gestiona todo desde un panel admin protegido con contraseña.

## Stack técnico

- **Next.js 14** (App Router, directorio `src/`)
- **Supabase** — base de datos PostgreSQL + Storage para imágenes
- **Tailwind CSS** — estilos, mobile-first
- **Vercel** — deploy (Edge Runtime en middleware)
- **jsPDF** — generación de PDF en el cierre de caja

## Reglas de código

- Variables, comentarios y texto UI en **español**
- Componentes simples, sin over-engineering
- Siempre manejar errores y estados de carga
- **Mobile-first** — la mayoría de los clientes usan el celular
- No agregar comentarios obvios; solo cuando el "por qué" no es evidente

## Paleta visual

- **Rojo** `#CC0000` — color principal (header, botones, acentos)
- **Blanco** y **negro/gris** — fondos y textos
- WhatsApp button: `#25D366` (color de marca, no cambiar)

---

## Base de datos — Supabase

### Tabla `productos`

| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | uuid PK | gen_random_uuid() | |
| `nombre` | text NOT NULL | | |
| `precio` | numeric(10,2) NOT NULL | | check >= 0 |
| `categoria` | text NOT NULL | 'General' | |
| `imagen_url` | text | null | URL pública del Storage |
| `stock` | integer | 0 | 0 = agotado |
| `activo` | boolean | true | false = oculto en catálogo |
| `created_at` | timestamptz | now() | |

RLS: SELECT público solo en filas con `activo = true`.

### Tabla `pedidos`

| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | uuid PK | gen_random_uuid() | |
| `items` | jsonb NOT NULL | | Array de `ItemPedido` |
| `total` | numeric(10,2) NOT NULL | | Incluye costo de envío |
| `datos_cliente` | jsonb | null | Objeto `DatosCheckout` |
| `estado` | text NOT NULL | 'pendiente' | 'pendiente' \| 'confirmado' \| 'cancelado' |
| `created_at` | timestamptz | now() | |

RLS: INSERT y SELECT públicos.

El costo de envío no se almacena como columna separada — se deriva de `total − suma(item.precio × item.cantidad)` cuando `datos_cliente.tipoEntrega === 'envio'`.

### Tabla `configuracion`

Fila única (id = 1). Se lee desde el carrito del cliente y se edita desde el panel admin.

| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | integer PK | 1 | Siempre 1, constraint CHECK |
| `costo_envio` | integer | 0 | 0 = envío gratis |
| `tiempo_entrega_activo` | boolean | false | Mostrar tiempo estimado en checkout |
| `tiempo_entrega_texto` | text | '30-45 minutos' | Texto editable |
| `telefono_requerido` | boolean | false | Hacer el teléfono obligatorio |
| `monto_minimo` | integer | 0 | 0 = sin pedido mínimo |

RLS: SELECT público.

### Storage

- Bucket: `productos` (público)
- Imágenes subidas desde el admin, servidas con URL pública de Supabase
- Validación server-side: solo imágenes, máx 5 MB
- Nombres únicos generados: `${Date.now()}-${random}.${ext}`

---

## Variables de entorno

Definidas en `.env.local` (ver `.env.local.example`).

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave anon pública (formato `sb_publishable_*`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Service role key — solo API Routes, nunca al cliente |
| `NEXT_PUBLIC_WHATSAPP_NUMERO` | Sí | Número sin `+` ni espacios (ej: `5491112345678`) |
| `ADMIN_PASSWORD` | Sí | Contraseña del panel admin |
| `NEXT_PUBLIC_INSTAGRAM_URL` | No | URL completa de Instagram; si no se define, el ícono no aparece |

---

## Migraciones SQL (correr en Supabase en orden)

1. `supabase/schema.sql` — tabla `productos` con RLS y datos de ejemplo
2. `supabase/migration_fase2.sql` — columna `stock` en productos, tabla `pedidos`
3. `supabase/migration_storage.sql` — bucket `productos` en Storage
4. `supabase/migration_configuracion.sql` — tabla `configuracion`, columna `datos_cliente` en pedidos
5. `supabase/migration_estados.sql` — columna `estado` en pedidos

---

## Funcionalidades implementadas

### App pública (`/`)

- **Catálogo de productos** cargado desde Supabase (solo activos), con skeleton de carga
- **Filtro por categoría** horizontal con scroll, generado dinámicamente desde los datos
- **Tarjetas de producto** con imagen (`object-contain` sobre fondo gris claro), precio en rojo, stock y control de cantidad inline
- **Carrito lateral** (drawer desde la derecha) con dos pasos:
  - **Paso 1 — Carrito**: lista de items, control +/−, total, botón "Continuar con el pedido"
  - **Paso 2 — Checkout**: formulario completo antes de enviar por WhatsApp
- **Formulario de checkout** con:
  - Nombre y apellido (obligatorio)
  - Tipo de entrega: Retiro en local / Envío a domicilio
  - Si envío: dirección y entre calles (obligatorio) + aviso del costo de envío
  - Método de pago: Efectivo / Transferencia
  - Si efectivo: ¿con cuánto abona? (opcional, para calcular vuelto)
  - Teléfono (opcional o requerido según configuración del admin)
  - Aclaraciones (opcional)
  - Muestra tiempo estimado de entrega si está activado en configuración
- **Monto mínimo**: botón "Continuar" deshabilitado con mensaje "Te faltan $X para el mínimo de $Y" si no se alcanza
- **Mensaje de WhatsApp** en texto puro con secciones marcadas: PEDIDO / DATOS DEL CLIENTE / ENTREGA / PAGO / TOTAL
- **Barra flotante** "Ver pedido" en la parte inferior cuando hay items en el carrito
- **Logo circular** del kiosco en el header (desde `public/logo.png`)
- **Ícono de Instagram** en el header (solo si `NEXT_PUBLIC_INSTAGRAM_URL` está configurada)

### Panel admin (`/admin`)

Autenticación custom con contraseña + cookie httpOnly de 7 días. El middleware protege todas las rutas `/admin/*` y `/api/admin/*`.

#### Pestaña Productos
- Lista completa de productos con nombre, categoría, precio y stock
- Toggle activo/inactivo por producto (verde/gris)
- Modal de edición — no se cierra al hacer click fuera, solo con la cruz o Cancelar
- Crear nuevo producto y eliminar con confirmación
- **Subida de imágenes** directa a Supabase Storage con preview instantáneo antes de guardar

#### Pestaña Pedidos
- Últimos 50 pedidos ordenados por fecha descendente
- **Filtro por estado** con contadores: Todos / Pendientes / Confirmados / Cancelados
- Cada tarjeta muestra: fecha y hora, badge de estado con color (amarillo/verde/rojo), nombre del cliente, entrega con dirección, método de pago, aclaraciones, items con precios, costo de envío desglosado, total en rojo
- **Selector de estado inline** por pedido: tres botones [Pendiente] [Confirmado] [Cancelado], el activo resaltado — cambia el estado via PATCH sin recargar

#### Pestaña Cierre de Caja
- **Solo cuenta pedidos con estado `confirmado`**
- Dos modos: **Pedidos de hoy** (carga automáticamente) o **Rango personalizado** (inputs nativos `type="date"` y `type="time"`)
- Resumen: total de pedidos, subtotal de productos, total de envíos, **total general** en bloque rojo destacado
- Desglose por método de pago (efectivo vs transferencia) con cantidades y totales
- Listado completo del período con todos los detalles de cada pedido
- Resumen final al pie del listado con total general + período
- **Botón Imprimir**: abre ventana nueva con HTML limpio en fuente monoespaciada, optimizado para impresora
- **Botón Exportar PDF**: genera PDF con logo del kiosco, resumen y listado completo (jsPDF con import dinámico para no impactar el bundle)

#### Pestaña Configuración
- **Pedido mínimo** ($): si es > 0, bloquea el checkout hasta alcanzarlo
- **Costo de envío** ($): se suma automáticamente al total si el cliente elige envío
- **Tiempo estimado**: toggle on/off + texto editable, se muestra en checkout y mensaje WhatsApp
- **Teléfono del cliente**: toggle para hacerlo requerido en el formulario de checkout
- Botón "Guardar cambios" con feedback visual de éxito/error

---

## Arquitectura técnica

### Autenticación del admin
- Contraseña almacenada en `ADMIN_PASSWORD` (env var)
- Login: `POST /api/auth` → setea cookie `admin_session` httpOnly por 7 días
- Middleware valida la cookie en cada request a rutas protegidas
- Sin Supabase Auth — sistema propio simple para un solo usuario

### Clientes de Supabase
- `src/lib/supabase.ts` — cliente anon, para componentes cliente y lectura pública
- `src/lib/supabaseAdmin.ts` — service role key, solo en API Routes. Configurado con `autoRefreshToken: false`, `persistSession: false` y header `Authorization: Bearer` explícito (necesario con el nuevo formato de keys `sb_publishable_*`)

### Middleware (`src/middleware.ts`)
- Matcher regex `/admin(.*)` — no usar `:path*` que falla en Vercel Edge Runtime
- Rutas API sin sesión → 401 JSON
- Rutas de página sin sesión → redirect a `/admin/login`
- Usuario ya autenticado en `/admin/login` → redirect a `/admin`

### Carrito
- Estado en `localStorage` via hook `useCarrito` (key: `'kiosco-carrito'`)
- Persiste entre recargas de página
- Al enviar el pedido: guarda en Supabase (fire-and-forget con `.then()`) y abre WhatsApp simultáneamente

---

## API Routes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth` | Login admin — setea cookie |
| DELETE | `/api/auth` | Logout admin — borra cookie |
| GET | `/api/admin/productos` | Todos los productos |
| POST | `/api/admin/productos` | Crear producto |
| PATCH | `/api/admin/productos/[id]` | Editar producto |
| DELETE | `/api/admin/productos/[id]` | Eliminar producto |
| GET | `/api/admin/pedidos` | Pedidos (params opcionales: `desde`, `hasta`, `estado`) |
| PATCH | `/api/admin/pedidos/[id]` | Actualizar estado u otros campos |
| GET | `/api/admin/configuracion` | Leer configuración |
| PATCH | `/api/admin/configuracion` | Guardar configuración |
| POST | `/api/admin/storage` | Subir imagen a Supabase Storage |

---

## Lo que viene — Sistema POS

Próxima fase: **punto de venta (POS)** integrado para cobros presenciales en el mostrador del kiosco.

### Objetivo
Unificar los pedidos online (WhatsApp) y las ventas presenciales en un único sistema, con el mismo catálogo, stock compartido y cierre de caja consolidado.

### Funcionalidades planificadas
- **Pantalla POS** en `/admin/pos`: grilla de productos con búsqueda rápida, agregar al ticket con un toque
- **Ticket de venta**: lista de items, subtotal, método de pago (efectivo/transferencia), campo de monto recibido con cálculo de vuelto automático
- **Sin checkout de delivery**: el POS no pide dirección ni datos de envío, es venta directa en mostrador
- **Imprimir ticket**: formato optimizado para impresoras térmicas (58mm / 80mm)
- **Integración con Cierre de Caja**: las ventas POS se consolidan en el resumen diferenciadas por canal (`'whatsapp'` vs `'presencial'`)

### Cambios técnicos implicados
- Agregar columna `canal` a la tabla `pedidos` con valores `'whatsapp'` | `'presencial'`
- El Cierre de Caja deberá filtrar y agrupar por canal
- La pantalla POS protegida igual que el resto del admin
- Evaluar modo offline básico (service worker) si la conexión es inestable en el kiosco
