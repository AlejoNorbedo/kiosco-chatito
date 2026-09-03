/**
 * Sesiones firmadas con HMAC-SHA256.
 *
 * Antes la cookie guardaba la contraseña en texto plano, así que filtrar la
 * cookie equivalía a filtrar la contraseña. Ahora guarda un token firmado con
 * vencimiento propio: sirve para validar la sesión pero no revela el secreto.
 *
 * Usa Web Crypto (crypto.subtle) porque el middleware corre en Edge Runtime,
 * donde no está disponible el módulo `crypto` de Node.
 */

export type Rol = 'admin' | 'empleada'

export const DURACION_SESION_SEG = 60 * 60 * 24 * 7 // 7 días

export const COOKIE_POR_ROL: Record<Rol, string> = {
  admin: 'admin_session',
  empleada: 'empleada_session',
}

const codificador = new TextEncoder()

/**
 * SESSION_SECRET es lo ideal, pero si no está definida caemos a ADMIN_PASSWORD
 * para no dejar al kiosco sin poder entrar tras el deploy. Se le agrega el rol
 * para que un token de empleada nunca valide como admin.
 */
function secretoDe(rol: Rol): string | null {
  const base = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD
  return base ? `${base}::${rol}` : null
}

function aBase64Url(bytes: Uint8Array): string {
  let binario = ''
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i])
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64Url(texto: string): Uint8Array {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binario = atob(relleno)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

async function firmar(datos: string, secreto: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw',
    codificador.encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const firma = await crypto.subtle.sign('HMAC', clave, codificador.encode(datos))
  return aBase64Url(new Uint8Array(firma))
}

/** Comparación de tiempo constante: no corta en el primer byte distinto. */
function sonIguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferencia = 0
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferencia === 0
}

export async function crearToken(rol: Rol): Promise<string | null> {
  const secreto = secretoDe(rol)
  if (!secreto) return null

  const payload = JSON.stringify({
    rol,
    exp: Math.floor(Date.now() / 1000) + DURACION_SESION_SEG,
  })
  const payloadCodificado = aBase64Url(codificador.encode(payload))
  const firma = await firmar(payloadCodificado, secreto)
  return `${payloadCodificado}.${firma}`
}

export async function tokenEsValido(token: string | undefined, rol: Rol): Promise<boolean> {
  if (!token) return false
  const secreto = secretoDe(rol)
  if (!secreto) return false

  const [payloadCodificado, firma] = token.split('.')
  if (!payloadCodificado || !firma) return false

  try {
    const firmaEsperada = await firmar(payloadCodificado, secreto)
    if (!sonIguales(firma, firmaEsperada)) return false

    const payload = JSON.parse(new TextDecoder().decode(deBase64Url(payloadCodificado)))
    return payload.rol === rol && typeof payload.exp === 'number' && payload.exp > Date.now() / 1000
  } catch {
    return false
  }
}

/**
 * Compara contraseñas por su hash para que el tiempo de respuesta no dependa
 * de cuántos caracteres acertó quien intenta adivinarla.
 */
export async function passwordCoincide(ingresada: string, esperada: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', codificador.encode(ingresada)),
    crypto.subtle.digest('SHA-256', codificador.encode(esperada)),
  ])
  return sonIguales(aBase64Url(new Uint8Array(hashA)), aBase64Url(new Uint8Array(hashB)))
}

export const OPCIONES_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: DURACION_SESION_SEG,
  path: '/',
} as const
