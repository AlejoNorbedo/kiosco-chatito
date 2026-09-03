# Kiosco Chatito

App web del kiosco de barrio **Kiosco Chatito**. Los clientes ven el catálogo,
arman el carrito y mandan el pedido por WhatsApp. El dueño gestiona productos,
pedidos, clientes y cierre de caja desde un panel protegido.

- **Catálogo público** — `/`
- **Panel del dueño** — `/admin`
- **Panel de empleadas** — `/empleada` (pedidos, mostrador y cierre de caja)

Stack: Next.js 14 (App Router) · Supabase (Postgres + Storage + Realtime) ·
Tailwind CSS · Vercel.

---

## Levantar el proyecto

```bash
npm install
cp .env.local.example .env.local   # y completar los valores
npm run dev                        # http://localhost:3000
```

### Variables de entorno

| Variable | Requerida | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (viaja al navegador) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave privada — **solo** en API Routes |
| `NEXT_PUBLIC_WHATSAPP_NUMERO` | Sí | Número del kiosco, sin `+` ni espacios |
| `ADMIN_PASSWORD` | Sí | Contraseña de `/admin` |
| `EMPLEADA_PASSWORD` | Sí | Contraseña de `/empleada` |
| `SESSION_SECRET` | Recomendada | Firma las cookies de sesión. Si falta, se usa `ADMIN_PASSWORD` |
| `NEXT_PUBLIC_INSTAGRAM_URL` | No | Si no está, el ícono no aparece |

Generar el secreto de sesión:

```bash
openssl rand -base64 32
```

### Base de datos

Correr los archivos de [`supabase/`](supabase/) en el SQL Editor, **en este orden**:

1. `schema.sql`
2. `migration_fase2.sql`
3. `migration_storage.sql`
4. `migration_configuracion.sql`
5. `migration_estados.sql`
6. `migration_descuentos_destacados.sql`
7. `migration_fidelizacion.sql`
8. `migration_gestion_clientes.sql`
9. `migration_rpc_eliminar_cliente.sql`
10. `migration_suma_puntos.sql`
11. `migration_subcategoria.sql`
12. `migration_horario.sql`
13. `migration_recargo_transferencia.sql`
14. `migration_seguridad_rls.sql` ← cierra el acceso público a datos sensibles
15. `migration_puntos_cliente.sql` ← habilita la consulta de puntos del cliente
16. `migration_pos.sql` ← agrega el canal de venta para el punto de venta

También hay que habilitar Realtime en `productos`:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE productos;
```

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir archivos |

CI corre los tres últimos en cada push y PR — ver
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Cómo está armado

```
src/
├── app/
│   ├── page.tsx              catálogo público
│   ├── admin/                panel del dueño (6 pestañas)
│   ├── empleada/             panel acotado para empleadas
│   └── api/
│       ├── pedidos/          alta de pedidos (público, valida contra la base)
│       ├── puntos/           saldo de puntos del cliente (público, acotado)
│       ├── admin/pos/        cobro de ventas en el mostrador
│       ├── auth/             login del dueño
│       ├── empleada/auth/    login de empleadas
│       └── admin/            CRUD protegido por middleware
├── components/               carrito, checkout, tarjetas, pestañas del admin
├── hooks/useCarrito.ts       carrito persistido en localStorage
├── lib/
│   ├── supabase.ts           cliente anon (navegador)
│   ├── supabaseAdmin.ts      cliente service role (solo servidor)
│   ├── sesion.ts             tokens de sesión firmados con HMAC
│   ├── rateLimit.ts          tope de intentos de login
│   ├── telefono.ts           normaliza teléfonos argentinos
│   ├── configuracion.ts      defaults de config y horario de atención
│   ├── productos.ts          precio efectivo y orden del catálogo
│   └── ventas.ts             precios, stock y puntos (online y mostrador)
└── middleware.ts             protege /admin, /api/admin y /empleada
```

### Decisiones de seguridad

Vale la pena tenerlas presentes antes de tocar estas partes:

- **La cookie de sesión es un token firmado**, no la contraseña. Se valida con
  HMAC-SHA256 vía Web Crypto porque el middleware corre en Edge Runtime, donde
  no existe el módulo `crypto` de Node.
- **El navegador nunca fija precios.** `POST /api/pedidos` recibe solo ids y
  cantidades, y recalcula subtotal, envío, recargo, total y puntos leyendo la
  base. Es la única vía de alta de pedidos.
- **La anon key no llega a datos personales.** `pedidos`, `clientes` e
  `historial_puntos` tienen RLS activo y cero políticas: solo entra la service
  role desde las API Routes.
- **El aviso de pedido nuevo va por `avisos_pedidos`**, una tabla que solo
  guarda ids. El panel la escucha por realtime y después pide el pedido
  completo a la API protegida.
- El tope de intentos de login vive en memoria del proceso. En Vercel es por
  instancia: frena fuerza bruta simple, no un ataque distribuido.

---

## Deploy

Vercel, rama `main` = producción. Cargar todas las variables de entorno en
**Project Settings → Environment Variables** antes del primer deploy.
