/**
 * Límite de intentos en memoria para los logins.
 *
 * En Vercel cada instancia serverless tiene su propio Map, así que no es un
 * candado perfecto: frena el goteo de fuerza bruta desde una IP, no un ataque
 * distribuido. Para un kiosco con dos contraseñas alcanza y no agrega
 * dependencias. Si algún día hace falta algo serio, va a Supabase o a Upstash.
 */

type Registro = { intentos: number; primerIntento: number; bloqueadoHasta: number }

const registros = new Map<string, Registro>()

const VENTANA_MS = 15 * 60 * 1000
const MAX_INTENTOS = 8
const BLOQUEO_MS = 15 * 60 * 1000

function limpiarVencidos(ahora: number) {
  const vencidas: string[] = []
  registros.forEach((registro, clave) => {
    if (registro.bloqueadoHasta < ahora && ahora - registro.primerIntento > VENTANA_MS) {
      vencidas.push(clave)
    }
  })
  vencidas.forEach((clave) => registros.delete(clave))
}

export function ipDe(request: Request): string {
  const reenviada = request.headers.get('x-forwarded-for')
  if (reenviada) return reenviada.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'desconocida'
}

/** Devuelve los segundos que faltan para poder reintentar, o 0 si puede pasar. */
export function segundosDeBloqueo(clave: string): number {
  const ahora = Date.now()
  limpiarVencidos(ahora)
  const registro = registros.get(clave)
  if (!registro || registro.bloqueadoHasta <= ahora) return 0
  return Math.ceil((registro.bloqueadoHasta - ahora) / 1000)
}

export function registrarFallo(clave: string) {
  const ahora = Date.now()
  const registro = registros.get(clave)

  if (!registro || ahora - registro.primerIntento > VENTANA_MS) {
    registros.set(clave, { intentos: 1, primerIntento: ahora, bloqueadoHasta: 0 })
    return
  }

  registro.intentos += 1
  if (registro.intentos >= MAX_INTENTOS) {
    registro.bloqueadoHasta = ahora + BLOQUEO_MS
    registro.intentos = 0
    registro.primerIntento = ahora
  }
}

export function limpiarIntentos(clave: string) {
  registros.delete(clave)
}
