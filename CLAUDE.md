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
- Antes de commitear: `npm run lint && npm run typecheck && npm run build` (es lo mismo que corre CI en cada push)
- **Nada de precios ni puntos calculados en el navegador**: lo que decide plata se calcula en el servidor contra la base

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
| `canal` | text NOT NULL | 'whatsapp' | 'whatsapp' \| 'presencial'. CHECK. Las ventas del POS entran como 'presencial' y ya confirmadas |
| `puntos_generados` | integer | 0 | Puntos que generó este pedido (solo de items con suma_puntos=true) |
| `created_at` | timestamptz | now() | |

RLS: **activo y sin políticas** — la anon key no lee ni escribe esta tabla (guarda nombres, direcciones y teléfonos). Solo entra la service role desde las API Routes. El alta pasa exclusivamente por `POST /api/pedidos`.

### Tabla `avisos_pedidos`

Tabla auxiliar para el aviso realtime de pedido nuevo. Solo tiene ids, ningún dato del cliente.

| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | uuid PK | gen_random_uuid() | |
| `pedido_id` | uuid FK → pedidos | | ON DELETE CASCADE |
| `created_at` | timestamptz | now() | |

La llena un trigger `AFTER INSERT ON pedidos`. RLS: SELECT público (es inocua). Realtime habilitado.

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
| `telefono_digitos` | text | generada | Columna GENERATED: `right(solo_digitos(telefono), 10)`. Los últimos 10 dígitos son el número argentino real, así que los prefijos `+54`, `9` y `0` se descartan solos y el cliente se encuentra escriba como escriba |
| `created_at` | timestamptz | now() | |

`puntos disponibles = puntos_acumulados - puntos_canjeados`

RLS: activo y sin políticas, igual que `pedidos` e `historial_puntos`. Antes estaba **desactivado**, lo que dejaba los teléfonos de todos los clientes legibles con la anon key.

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
| `ADMIN_PASSWORD` | Sí | Contraseña del panel admin (`/admin`) |
| `EMPLEADA_PASSWORD` | Sí | Contraseña del panel de empleadas (`/empleada`) |
| `SESSION_SECRET` | Recomendada | Clave con la que se firman las cookies de sesión. Si falta, se usa `ADMIN_PASSWORD` como respaldo. Definirla permite cambiar contraseñas sin cerrar sesiones y viceversa |
| `NEXT_PUBLIC_INSTAGRAM_URL` | No | URL completa de Instagram; si no se define, el ícono no aparece |

---

## Migraciones SQL (correr en Supabase en orden)

1. `supabase/schema.sql` — tabla `productos` con RLS y datos de ejemplo
2. `supabase/migration_fase2.sql` — columna `stock` en productos, tabla `pedidos`
3. `supabase/migration_storage.sql` — bucket `productos` en Storage
4. `supabase/migration_configuracion.sql` — tabla `configuracion`, columna `datos_cliente` en pedidos
5. `supabase/migration_estados.sql` — columna `estado` en pedidos
6. `supabase/migration_descuentos_destacados.sql` — columnas `precio_oferta` y `destacado` en productos
7. `supabase/migration_fidelizacion.sql` — tabla `clientes`, columnas de fidelización en `configuracion`
8. `supabase/migration_gestion_clientes.sql` — tabla `historial_puntos`, columna `puntos_generados` en pedidos
9. `supabase/migration_rpc_eliminar_cliente.sql` — función `eliminar_cliente`
10. `supabase/migration_suma_puntos.sql` — columna `suma_puntos` en productos
11. `supabase/migration_subcategoria.sql` — columna `subcategoria` en productos
12. `supabase/migration_horario.sql` — columnas de horario en `configuracion`
13. `supabase/migration_recargo_transferencia.sql` — columna `recargo_transferencia` en productos, columna `recargo_transferencia_pct` en configuracion, habilita Realtime en tabla `productos`
14. `supabase/migration_seguridad_rls.sql` — cierra el acceso público a `pedidos`, `clientes` e `historial_puntos`; crea `avisos_pedidos` con su trigger y la suma a Realtime
15. `supabase/migration_puntos_cliente.sql` — columna generada `telefono_digitos` en `clientes` con su índice, para la consulta de puntos del cliente
16. `supabase/migration_pos.sql` — columna `canal` en `pedidos` y su índice; recrea el trigger de avisos para que solo dispare con `canal = 'whatsapp'`

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
- **Chip de puntos** en el header (`MisPuntos.tsx`): visible solo si la fidelización está activa. Muestra ★ y el saldo apenas se conoce el teléfono, y al tocarlo abre el detalle con la barra de progreso hacia el premio. El teléfono se guarda en `localStorage` (`kiosco-telefono`) al cerrar un pedido, así el cliente no lo escribe de nuevo — y también precarga el campo del checkout
- **PWA**: installable via `next-pwa`, manifest configurado. En Android el `ModalInstalacion` ofrece un botón de instalación de un toque usando el `beforeinstallprompt` que captura el layout; en iOS quedan las instrucciones manuales, que es lo único que expone Safari

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

#### Pestaña Mostrador (POS)
- Grilla de productos activos con búsqueda y filtro por categoría; un toque agrega al ticket y la tarjeta muestra la cantidad
- Barra inferior fija con unidades y total, y botón **Cobrar**
- Panel de cobro: items con +/−, método de pago, monto recibido con **cálculo de vuelto**, y teléfono opcional para sumar puntos
- Al confirmar: la venta queda registrada como `canal = 'presencial'` y `estado = 'confirmado'`, descuenta stock y acredita puntos
- Pantalla de cierre con el vuelto en grande y los puntos que sumó
- Los productos se leen con la clave pública (solo trae activos), no por `/api/admin/productos`: así la pantalla sirve igual para el dueño y para las empleadas sin ampliarles permisos

#### Pestaña QR
- Genera el QR del catálogo con la librería `qrcode` (import dinámico, no pesa en el bundle inicial)
- Apunta por defecto a `window.location.origin`, así siempre da al dominio correcto; el campo es editable
- **Imprimir cartel**: abre una ventana con el cartel listo para pegar en el mostrador (logo, QR, dominio e instrucción de instalar)
- **Descargar QR**: PNG suelto para Instagram o volantes
- El QR no instala nada: abre el sitio, y ahí actúa el `ModalInstalacion`

#### Pestaña Configuración
- Pedido mínimo, costo de envío, tiempo estimado, teléfono requerido
- **Sistema de fidelización**: pesos por punto, puntos para canjear, descripción del premio
- **Recargo por transferencia**: porcentaje aplicado a productos con `recargo_transferencia=true`
- **Horario de atención**: toggle + apertura/cierre + días de la semana
- Todos los inputs numéricos usan `value={X || ''}` para evitar el bug de React que impide borrar el 0 en mobile
- Botón "Guardar cambios" con feedback visual

### Panel de empleadas (`/empleada`)

Acceso acotado para quien atiende el mostrador: ve y despacha pedidos, pero no toca productos, clientes ni configuración.

- Login propio con `EMPLEADA_PASSWORD` y cookie `empleada_session` (misma mecánica de token firmado que el admin)
- **Pestaña Pedidos**: últimos 50 pedidos, filtro por estado y selector de estado inline. Sin notificación realtime (esa queda solo en el admin)
- **Pestaña Mostrador**: el mismo POS que el admin — son las que atienden
- **Pestaña Cierre de Caja**: reutiliza el componente `CierreCaja` del admin
- El middleware le permite `GET` y `PATCH` sobre `/api/admin/pedidos` y `POST` sobre `/api/admin/pos`; el resto de `/api/admin` le responde 401
- Tiene manifest PWA propio con su `start_url`, separado del admin (hacía falta para que iOS instalara cada panel en su acceso directo)

---

## Arquitectura técnica

### Autenticación (`src/lib/sesion.ts`)
Sin Supabase Auth — sistema propio para dos roles: `admin` y `empleada`.

- Login: `POST /api/auth` (admin) o `POST /api/empleada/auth` (empleada) → setea una cookie httpOnly de 7 días
- **La cookie guarda un token firmado, no la contraseña.** Formato `payload.firma`, donde `payload` es `{ rol, exp }` en base64url y `firma` es un HMAC-SHA256 sobre ese payload
- El secreto es `SESSION_SECRET` (o `ADMIN_PASSWORD` como respaldo) concatenado con el rol, para que un token de empleada nunca valide como admin
- Se usa **Web Crypto (`crypto.subtle`)** y no el módulo `crypto` de Node: el middleware corre en Edge Runtime
- Las contraseñas se comparan por su hash SHA-256 en tiempo constante, así el tiempo de respuesta no filtra cuántos caracteres acertó quien intenta adivinarla
- `src/lib/rateLimit.ts` bloquea la IP 15 minutos tras 8 intentos fallidos. Es un `Map` en memoria: en Vercel es por instancia, así que frena fuerza bruta simple, no un ataque distribuido

### Módulos compartidos (`src/lib/`)
Lo que usan dos o más pantallas vive acá, porque duplicado se desincroniza:

- `configuracion.ts` — `CONFIG_DEFECTO` y `estaAbierto()`, que usaban por igual el catálogo, el carrito y el admin
- `productos.ts` — `precioEfectivo()` y `ordenarProductos()`. Estaban duplicados y ya se habían desincronizado: el catálogo ordenaba por precio efectivo y el admin por precio de lista, así que un producto en oferta caía en distinto lugar en cada pantalla
- `telefono.ts` — `variantesTelefono()`, la normalización de teléfonos argentinos
- `ventas.ts` — el cálculo de una venta, compartido por el checkout online y el mostrador: `resolverItems()` (precios desde la base), `calcularRecargo()`, `descontarStock()` y `acreditarPuntos()`. Así las dos vías cobran y puntúan igual
- `sesion.ts` y `rateLimit.ts` — sesiones firmadas y tope de intentos

### Identificación del cliente por teléfono
Todo lo que busca un cliente lo hace por `telefono_digitos`, nunca por igualdad exacta sobre `telefono`: el alta de puntos en `POST /api/pedidos`, el descuento al cancelar un pedido y la consulta de `GET /api/puntos`. Buscar por igualdad exacta le creaba un cliente nuevo —con los puntos en cero— cada vez que la persona escribía su número con otro formato.

### Clientes de Supabase
- `src/lib/supabase.ts` — cliente anon, para componentes cliente y lectura pública
- `src/lib/supabaseAdmin.ts` — service role key, solo en API Routes. Configurado con `autoRefreshToken: false`, `persistSession: false` y header `Authorization: Bearer` explícito (necesario con el nuevo formato de keys `sb_publishable_*`)

### Middleware (`src/middleware.ts`)
- Matcher regex `/admin(.*)` — no usar `:path*` que falla en Vercel Edge Runtime
- Es `async` porque verificar el HMAC del token lo es
- Rutas API sin sesión → 401 JSON
- Rutas de página sin sesión → redirect a `/admin/login` o `/empleada/login`
- Usuario ya autenticado en una página de login → redirect a su panel
- `/api/admin/pedidos` acepta admin **o** empleada; el resto de `/api/admin` es solo admin

### Alta de pedidos (`POST /api/pedidos`)
Es la **única** vía por la que entra un pedido del cliente, y el navegador no fija precios.

- El navegador manda solo `{ items: [{ producto_id, cantidad }], datos }`
- El servidor lee los productos y la configuración de la base y recalcula subtotal, costo de envío, recargo por transferencia, total y puntos
- Valida: producto existente y `activo`, cantidades enteras 1–99, monto mínimo, teléfono si `telefono_requerido`, y recorta los strings del formulario
- Devuelve los totales, que son los que el cliente usa para armar el mensaje de WhatsApp — así el mensaje refleja lo que quedó guardado
- Si falla la acreditación de puntos, el pedido igual se guarda: el admin los ajusta a mano

> Antes el navegador insertaba directo en `pedidos` con el total que él mismo calculaba y pedía los puntos a un `/api/fidelizacion` público pasándole el monto. Con la consola abierta se podía cargar un pedido de $1 o regalarse puntos.

### Carrito
- Estado en `localStorage` via hook `useCarrito` (key: `'kiosco-carrito'`)
- Persiste entre recargas de página
- `totalPrecio` usa `precio_oferta ?? precio` — para mostrar; el total que vale lo calcula el servidor
- Al enviar: `window.open('', '_blank')` **sincrónico** (dentro del gesto del usuario, si no el celular lo bloquea), después `await` al POST, y recién ahí se le asigna la URL de WhatsApp. Si el popup fue bloqueado igual, navega en la misma pestaña
- Estados `enviando` y `errorEnvio` deshabilitan el botón y muestran el error del servidor

### Sistema de fidelización
- Puntos calculados solo sobre items con `suma_puntos = true` usando precio efectivo
- `puntos_ganados = Math.floor(subtotalElegible / puntos_por_monto)` — se calcula **en el servidor**, dentro de `POST /api/pedidos`
- Solo se procesan si el cliente proporcionó teléfono
- Creación/actualización de cliente por upsert según teléfono
- `puntos disponibles = puntos_acumulados - puntos_canjeados` — los puntos canjeados nunca se borran, solo se acumulan

### Consulta de puntos del cliente
- `GET /api/puntos?telefono=…` es público, porque la única identificación que tiene el cliente es su teléfono
- Devuelve **solo** el saldo, los puntos para canjear y el mensaje del premio. Nunca el nombre, el historial ni los pedidos: así, quien probara números al azar solo averiguaría cuántos puntos tiene un teléfono
- Cada consulta que no encuentra a nadie cuenta como intento fallido en `rateLimit`, así probar números en serie bloquea la IP mientras que el cliente real nunca llega al tope
- `variantesTelefono()` arma las formas en que un argentino puede escribir el mismo número y busca todas con `.in()`. Los prefijos `+54`, `9` y `0` los resuelve la columna al quedarse con los últimos 10 dígitos; el `15` se maneja acá porque va en el medio, después de un código de área de 2, 3 o 4 dígitos
- **Suma** todas las filas que coincidan, por si el mismo número quedó cargado con dos formatos distintos

### Recargo por transferencia
- Flag `recargo_transferencia` por producto (configurable en admin)
- Porcentaje global `recargo_transferencia_pct` en configuracion
- `recargo = Math.round(subtotalRecargable * pct / 100)` — solo cuando metodoPago === 'transferencia'
- Se muestra en la tarjeta del producto, en el desglose del checkout y en el mensaje de WhatsApp

### Realtime (Supabase)
- **Admin → avisos de pedido**: canal `admin-avisos-pedidos`, evento INSERT sobre `avisos_pedidos`. Con el `pedido_id` del payload pide el pedido completo a `GET /api/admin/pedidos?id=…`. Usa `tabRef` para evitar stale closure al verificar si el admin está en la pestaña Pedidos
  - No escucha `pedidos` directamente porque esa tabla ya no es legible con la anon key, y Realtime aplica RLS: no llegaría ningún evento
- **Catálogo público → productos**: canal `catalogo-productos-realtime`, evento `*`. Al detectar cualquier cambio, re-fetcha la lista completa con el filtro `activo=true`
- Ambas tablas deben estar en la publicación de realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE avisos_pedidos; ALTER PUBLICATION supabase_realtime ADD TABLE productos;`

### Row Level Security
La anon key viaja en el bundle del navegador: todo lo que ella pueda leer es público de hecho.

| Tabla | Acceso con anon key |
|---|---|
| `productos` | SELECT donde `activo = true` |
| `configuracion` | SELECT |
| `avisos_pedidos` | SELECT (solo ids, sin datos personales) |
| `pedidos` | **ninguno** — RLS activo, cero políticas |
| `clientes` | **ninguno** |
| `historial_puntos` | **ninguno** |

`service_role` tiene BYPASSRLS, así que las API Routes siguen accediendo a todo sin necesidad de políticas `TO service_role`.

---

## API Routes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth` | Login admin — setea cookie con token firmado |
| DELETE | `/api/auth` | Logout admin — borra cookie |
| POST | `/api/empleada/auth` | Login empleada |
| DELETE | `/api/empleada/auth` | Logout empleada |
| POST | `/api/pedidos` | **Público.** Alta de pedido: recalcula precios y puntos contra la base |
| GET | `/api/puntos` | **Público.** Saldo de puntos por teléfono (param `telefono`). Devuelve solo puntos y premio, nunca nombre ni historial |
| GET | `/api/admin/productos` | Todos los productos |
| POST | `/api/admin/productos` | Crear producto |
| PATCH | `/api/admin/productos/[id]` | Editar producto |
| DELETE | `/api/admin/productos/[id]` | Eliminar producto |
| GET | `/api/admin/pedidos` | Pedidos (params: `id`, `desde`, `hasta`, `estado`, `telefono`). Con `id` devuelve uno solo — lo usa el aviso realtime. Accesible también para empleadas |
| PATCH | `/api/admin/pedidos/[id]` | Cambiar el estado. **Solo acepta `estado`** — el middleware da acceso también a empleadas, así que no puede tocar totales ni items |
| GET | `/api/admin/configuracion` | Leer configuración |
| PATCH | `/api/admin/configuracion` | Guardar configuración |
| POST | `/api/admin/storage` | Subir imagen a Supabase Storage |
| POST | `/api/admin/pos` | Cobrar una venta de mostrador. Accesible también para empleadas |
| GET | `/api/admin/clientes` | Lista de clientes con puntos |
| PATCH | `/api/admin/clientes/[id]` | Editar cliente, ajustar puntos o registrar canje |
| DELETE | `/api/admin/clientes/[id]` | Eliminar cliente y su historial (RPC) |
| GET | `/api/admin/clientes/[id]/historial` | Historial de puntos del cliente |

---

## Canales de venta

Los pedidos de WhatsApp y las ventas de mostrador viven en la misma tabla `pedidos`, distinguidas por `canal`. Comparten stock, cierre de caja y fidelización, que es todo el punto de unificarlas.

| | `whatsapp` | `presencial` |
|---|---|---|
| Entra por | `POST /api/pedidos` (público) | `POST /api/admin/pos` (admin o empleada) |
| Estado inicial | `pendiente` | `confirmado` — la plata ya se cobró |
| Stock | se descuenta al confirmar desde el panel | se descuenta en el acto |
| Envío y monto mínimo | sí | no, es venta directa |
| Recargo por transferencia | sí | sí |
| Avisa por realtime | sí | **no** — el trigger filtra por `canal = 'whatsapp'`, si no el kiosquero se avisaría a sí mismo de la venta que acaba de cargar |

### Lo que viene

- **Ticket impreso** para el POS (térmica 58/80mm). Hoy la venta queda solo en pantalla.
- **Modo offline** en el POS si la conexión del kiosco resulta inestable.
- **Partir `admin/page.tsx`**, que ya pasó las 1000 líneas con 8 pestañas.
- **Migrar a Next 16**: los avisos `high` de `npm audit` que quedan son casi todos de build (`eslint`, `workbox`, `postcss`); el de `next` aplica a self-hosted, no a Vercel. Conviene hacerlo aparte, no mezclado con features.
