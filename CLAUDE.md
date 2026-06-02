# Kiosco Chatito — App Web

App web para el kiosco de barrio "Kiosco Chatito". Permite a los clientes ver el catálogo, armar un carrito con checkout completo y enviar el pedido por WhatsApp. El dueño gestiona todo desde un panel admin protegido con contraseña.

## Stack técnico

- **Next.js 14** (App Router, directorio `src/`)
- **Supabase** — base de datos PostgreSQL + Storage para imágenes + Realtime
- **Tailwind CSS** — estilos, mobile-first
- **Vercel** — deploy (Edge Runtime en middleware), rama `main` = producción
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
| `precio_oferta` | numeric(10,2) | null | Si está seteado, se muestra tachado el precio normal y badge OFERTA |
| `categoria` | text NOT NULL | 'General' | |
| `subcategoria` | text | null | Agrupa productos dentro de una categoría |
| `imagen_url` | text | null | URL pública del Storage |
| `stock` | integer | 0 | 0 = agotado |
| `activo` | boolean | true | false = oculto en catálogo |
| `destacado` | boolean | false | Aparece en sección Destacados encima del catálogo |
| `suma_puntos` | boolean | true | false = no acumula puntos de fidelización (ej: cigarrillos) |
| `recargo_transferencia` | boolean | false | Si es true, se aplica recargo_transferencia_pct al pagar con transferencia |
| `created_at` | timestamptz | now() | |

RLS: SELECT público solo en filas con `activo = true`. Realtime habilitado (`supabase_realtime publication`).

### Tabla `pedidos`

| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | uuid PK | gen_random_uuid() | |
| `items` | jsonb NOT NULL | | Array de `ItemPedido` |
| `total` | numeric(10,2) NOT NULL | | Incluye costo de envío y recargo por transferencia |
| `datos_cliente` | jsonb | null | Objeto `DatosCheckout` |
| `estado` | text NOT NULL | 'pendiente' | 'pendiente' \| 'confirmado' \| 'cancelado' |
| `puntos_generados` | integer | 0 | Puntos que generó este pedido (solo de items con suma_puntos=true) |
| `created_at` | timestamptz | now() | |

RLS: INSERT y SELECT públicos. Realtime habilitado.

El costo de envío no se almacena como columna separada — se deriva de `total − suma(item.precio × item.cantidad) − recargo` cuando `datos_cliente.tipoEntrega === 'envio'`.

### Tabla `configuracion`

Fila única (id = 1). Se lee desde el carrito del cliente y se edita desde el panel admin.

| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | integer PK | 1 | Siempre 1, constraint CHECK |
| `costo_envio` | integer | 0 | 0 = envío gratis |
| `tiempo_entrega_activo` | boolean | false | Mostrar tiempo estimado en checkout |
| `tiempo_entrega_texto` | text | '30-45 minutos' | Texto editable |
| `telefono_requerido` | boolean | false | Hacer el teléfono obligatorio en checkout |
| `monto_minimo` | integer | 0 | 0 = sin pedido mínimo |
| `puntos_por_monto` | integer | 0 | Pesos necesarios para ganar 1 punto (0 = fidelización desactivada) |
| `puntos_para_canje` | integer | 0 | Puntos necesarios para canjear el premio |
| `mensaje_canje` | text | '' | Descripción del premio (ej: "Una gaseosa gratis") |
| `horario_activo` | boolean | false | Bloquear pedidos fuera del horario |
| `horario_apertura` | text | '09:00' | Formato HH:MM |
| `horario_cierre` | text | '22:00' | Formato HH:MM |
| `dias_activos` | integer[] | [0,1,2,3,4,5,6] | Días de la semana (0=dom, 1=lun, ..., 6=sáb) |
| `recargo_transferencia_pct` | integer | 0 | Porcentaje de recargo para productos con recargo_transferencia=true al pagar con transferencia |

RLS: SELECT público.

### Tabla `clientes`

Clientes del sistema de fidelización. Se crean automáticamente cuando un cliente pide y proporciona teléfono.

| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | uuid PK | gen_random_uuid() | |
| `telefono` | text UNIQUE NOT NULL | | Clave de identificación |
| `nombre` | text NOT NULL | | |
| `puntos_acumulados` | integer | 0 | Total histórico de puntos ganados |
| `puntos_canjeados` | integer | 0 | Total histórico de puntos canjeados |
| `created_at` | timestamptz | now() | |

`puntos disponibles = puntos_acumulados - puntos_canjeados`

### Tabla `historial_puntos`

Registro de movimientos de puntos por cliente.

| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | uuid PK | gen_random_uuid() | |
| `cliente_id` | uuid FK → clientes | | |
| `concepto` | text NOT NULL | | Descripción del movimiento |
| `puntos` | integer NOT NULL | | Positivo = ganancia, negativo = canje/descuento |
| `created_at` | timestamptz | now() | |

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
6. `supabase/migration_descuentos_destacados.sql` — columnas `precio_oferta` y `destacado` en productos
7. `supabase/migration_fidelizacion.sql` — tablas `clientes` e `historial_puntos`, columnas de fidelización en `configuracion`, columna `puntos_generados` en pedidos, función `eliminar_cliente`
8. `supabase/migration_suma_puntos.sql` — columna `suma_puntos` en productos
9. `supabase/migration_subcategorias.sql` — columna `subcategoria` en productos
10. `supabase/migration_horario.sql` — columnas de horario en `configuracion`
11. `supabase/migration_recargo_transferencia.sql` — columna `recargo_transferencia` en productos, columna `recargo_transferencia_pct` en configuracion, habilita Realtime en tabla `productos`

---

## Funcionalidades implementadas

### App pública (`/`)

- **Catálogo de productos** cargado desde Supabase (solo activos), con skeleton de carga
- **Realtime**: el catálogo se actualiza automáticamente si el admin cambia precios, stock o activa/desactiva productos — sin recargar la página
- **Filtro por categoría** horizontal con scroll en mobile, wrap en desktop; generado dinámicamente
- **Sección Destacados**: fila de productos marcados como destacados, visible solo en "Todos" sin búsqueda activa
- **Agrupación por subcategoría**: al filtrar por categoría, si hay subcategorías se muestran como secciones con título
- **Búsqueda** y **orden** (A→Z, Z→A, menor/mayor precio, orden de carga) en una sola fila
- **Tarjetas de producto**: imagen (`object-contain`), precio en rojo, precio tachado si hay oferta, badge OFERTA, indicador naranja "+X% con transferencia" si aplica recargo, control de cantidad inline
- **Carrito lateral** (drawer desde la derecha) con dos pasos:
  - **Paso 1 — Carrito**: lista de items con precio efectivo (oferta si aplica), control +/−, total, botón "Continuar"
  - **Paso 2 — Checkout**: formulario completo antes de enviar por WhatsApp
- **Formulario de checkout** con:
  - Nombre y apellido (obligatorio)
  - Tipo de entrega: Retiro en local / Envío a domicilio
  - Si envío: dirección y entre calles + aviso del costo de envío
  - Método de pago: Efectivo / Transferencia
  - Si hay productos con recargo y el cliente elige Transferencia: aviso + línea de recargo en el desglose del total
  - Si efectivo: ¿con cuánto abona?
  - Teléfono (opcional o requerido según config)
  - Aclaraciones (opcional)
  - Tiempo estimado si está activado en config
- **Monto mínimo**: botón "Continuar" deshabilitado con mensaje "Te faltan $X"
- **Horario de atención**: si está activo y el local está cerrado, se muestra un aviso y se bloquea el botón de continuar
- **Mensaje de WhatsApp** en texto puro: PEDIDO / DATOS / ENTREGA / PAGO / TOTAL (con desglose de envío y recargo si aplican) / PUNTOS DE FIDELIDAD si corresponde
- **Barra flotante** "Ver pedido" en la parte inferior cuando hay items
- **Logo circular** en header desde `public/logo.png`
- **Ícono de Instagram** en header (solo si `NEXT_PUBLIC_INSTAGRAM_URL` está definida)
- **PWA**: installable via `next-pwa`, manifest configurado

### Panel admin (`/admin`)

Autenticación custom con contraseña + cookie httpOnly de 7 días. El middleware protege todas las rutas `/admin/*` y `/api/admin/*`.

#### Pestaña Dashboard
- Estadísticas de los últimos 30 días (solo pedidos confirmados): total del día, semana y mes
- Gráfico de barras CSS de los últimos 7 días (hoy resaltado en rojo)
- Top 5 productos más vendidos con barra proporcional

#### Pestaña Productos
- Búsqueda por nombre
- Filtro por categoría (chips, generado dinámicamente)
- Filtro por subcategoría (chips secundarios, aparece al seleccionar una categoría que tenga subcategorías)
- Contador de resultados según filtros activos
- Orden configurable (carga, A→Z, Z→A, menor/mayor precio)
- Badges en cada producto: ★ (destacado), `sin pts` (suma_puntos=false), `OFERTA` (precio_oferta), `+transf` (recargo_transferencia) — siempre visibles, no se cortan
- Toggle activo/inactivo por producto
- Crear nuevo producto y eliminar con confirmación
- **Modal de edición/creación** con campos: nombre, categoría (con autocompletado de existentes), subcategoría (con autocompletado), precio, stock, precio de oferta, imagen (upload a Storage con preview), checkboxes: activo, destacado, suma puntos, recargo por transferencia

#### Pestaña Pedidos
- Últimos 50 pedidos ordenados por fecha descendente
- **Notificación realtime**: cuando llega un pedido nuevo suena un tono y aparece un toast. Hay un badge con contador en la pestaña si el admin no está en Pedidos
- Filtro por estado con contadores: Todos / Pendientes / Confirmados / Cancelados
- Tarjeta por pedido: fecha/hora, badge de estado, nombre del cliente, entrega, método de pago, teléfono, aclaraciones, items, desglose de envío, total
- **Selector de estado inline** [Pendiente] [Confirmado] [Cancelado]
- Al confirmar un pedido: si tiene teléfono, abre WhatsApp automáticamente con mensaje de confirmación

#### Pestaña Cierre de Caja
- Solo pedidos con estado `confirmado`
- Dos modos: Pedidos de hoy (automático) o Rango personalizado (date + time)
- Resumen: cantidad de pedidos, subtotal de productos, total de envíos, **total general**
- Desglose por método de pago (efectivo vs transferencia)
- Listado completo del período
- **Botón Imprimir**: HTML limpio en fuente monoespaciada
- **Botón Exportar PDF**: jsPDF con import dinámico, incluye logo y desglose completo

#### Pestaña Clientes
- Lista de clientes del sistema de fidelización con búsqueda por nombre o teléfono
- Muestra: puntos disponibles, acumulados y canjeados
- **Botón 🎁 Entregar premio** (naranja): aparece cuando el cliente tiene suficientes puntos. Al confirmar muestra cuántos puntos le quedarán después
- **✏️ Editar**: cambiar nombre, teléfono, ajuste manual de puntos (positivo o negativo) con motivo obligatorio. Botón "Limpiar todo" para resetear puntos a 0 de un toque
- **★ Historial**: movimientos de puntos con fecha y concepto
- **📋 Pedidos**: historial de pedidos del cliente filtrado por teléfono
- **🗑️ Eliminar**: borra cliente e historial (via función RPC en Supabase)

#### Pestaña Configuración
- Pedido mínimo, costo de envío, tiempo estimado, teléfono requerido
- **Sistema de fidelización**: pesos por punto, puntos para canjear, descripción del premio
- **Recargo por transferencia**: porcentaje aplicado a productos con `recargo_transferencia=true`
- **Horario de atención**: toggle + apertura/cierre + días de la semana
- Todos los inputs numéricos usan `value={X || ''}` para evitar el bug de React que impide borrar el 0 en mobile
- Botón "Guardar cambios" con feedback visual

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
- `totalPrecio` usa `precio_oferta ?? precio`
- Al enviar: guarda en Supabase (fire-and-forget) y abre WhatsApp simultáneamente

### Sistema de fidelización
- Puntos calculados solo sobre items con `suma_puntos = true` usando precio efectivo
- `puntos_ganados = Math.floor(subtotalElegible / puntos_por_monto)`
- Solo se procesan si el cliente proporcionó teléfono
- Creación/actualización de cliente via `POST /api/fidelizacion` (upsert por teléfono)
- `puntos disponibles = puntos_acumulados - puntos_canjeados` — los puntos canjeados nunca se borran, solo se acumulan

### Recargo por transferencia
- Flag `recargo_transferencia` por producto (configurable en admin)
- Porcentaje global `recargo_transferencia_pct` en configuracion
- `recargo = Math.round(subtotalRecargable * pct / 100)` — solo cuando metodoPago === 'transferencia'
- Se muestra en la tarjeta del producto, en el desglose del checkout y en el mensaje de WhatsApp

### Realtime (Supabase)
- **Admin → pedidos**: canal `admin-pedidos-realtime`, evento INSERT. Usa `tabRef` para evitar stale closure al verificar si el admin está en la pestaña Pedidos
- **Catálogo público → productos**: canal `catalogo-productos-realtime`, evento `*`. Al detectar cualquier cambio, re-fetcha la lista completa con el filtro `activo=true`
- Ambas tablas deben estar en la publicación de realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE pedidos; ALTER PUBLICATION supabase_realtime ADD TABLE productos;`

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
| GET | `/api/admin/pedidos` | Pedidos (params: `desde`, `hasta`, `estado`, `telefono`) |
| PATCH | `/api/admin/pedidos/[id]` | Actualizar estado u otros campos |
| GET | `/api/admin/configuracion` | Leer configuración |
| PATCH | `/api/admin/configuracion` | Guardar configuración |
| POST | `/api/admin/storage` | Subir imagen a Supabase Storage |
| GET | `/api/admin/clientes` | Lista de clientes con puntos |
| PATCH | `/api/admin/clientes/[id]` | Editar cliente, ajustar puntos o registrar canje |
| DELETE | `/api/admin/clientes/[id]` | Eliminar cliente y su historial (RPC) |
| GET | `/api/admin/clientes/[id]/historial` | Historial de puntos del cliente |
| POST | `/api/fidelizacion` | Upsert de cliente por teléfono y suma de puntos |

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
