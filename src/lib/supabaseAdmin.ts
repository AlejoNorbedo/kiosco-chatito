import { createClient } from '@supabase/supabase-js'

// Solo usar en API Routes (server-side). Nunca importar desde componentes client.
export function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
