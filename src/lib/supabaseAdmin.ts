import { createClient } from '@supabase/supabase-js'

// Solo usar en API Routes (server-side). Nunca importar desde componentes client.
export function crearClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      `Faltan variables de entorno de Supabase. URL: ${!!url}, SERVICE_KEY: ${!!key}`
    )
  }

  return createClient(url, key, {
    auth: {
      // Crítico en serverless: deshabilitar refresh y persistencia de sesión
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        // Forzar el Bearer explícito — necesario con el nuevo formato de keys
        // de Supabase (sb_secret_*) para que el RLS sea bypasseado correctamente
        Authorization: `Bearer ${key}`,
      },
    },
  })
}
