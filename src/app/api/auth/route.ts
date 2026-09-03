import { NextResponse } from 'next/server'
import { COOKIE_POR_ROL, OPCIONES_COOKIE, crearToken, passwordCoincide } from '@/lib/sesion'
import { ipDe, limpiarIntentos, registrarFallo, segundosDeBloqueo } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const clave = `admin:${ipDe(request)}`
  const bloqueo = segundosDeBloqueo(clave)
  if (bloqueo > 0) {
    return NextResponse.json(
      { error: `Demasiados intentos. Probá de nuevo en ${Math.ceil(bloqueo / 60)} minutos.` },
      { status: 429 }
    )
  }

  const esperada = process.env.ADMIN_PASSWORD
  if (!esperada) {
    return NextResponse.json({ error: 'El panel no está configurado' }, { status: 500 })
  }

  let password: unknown
  try {
    password = (await request.json())?.password
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  if (typeof password !== 'string' || !(await passwordCoincide(password, esperada))) {
    registrarFallo(clave)
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const token = await crearToken('admin')
  if (!token) {
    return NextResponse.json({ error: 'El panel no está configurado' }, { status: 500 })
  }

  limpiarIntentos(clave)
  const respuesta = NextResponse.json({ ok: true })
  respuesta.cookies.set(COOKIE_POR_ROL.admin, token, OPCIONES_COOKIE)
  return respuesta
}

export async function DELETE() {
  const respuesta = NextResponse.json({ ok: true })
  respuesta.cookies.delete(COOKIE_POR_ROL.admin)
  return respuesta
}
