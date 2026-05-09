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
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      // cache: 'no-store' evita que Next.js cachée las respuestas de Supabase
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: 'no-store' }),
      headers: {
        Authorization: `Bearer ${key}`,
      },
    },
  })
}
