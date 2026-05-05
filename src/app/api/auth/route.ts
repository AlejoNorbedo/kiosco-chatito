import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const respuesta = NextResponse.json({ ok: true })
  respuesta.cookies.set('admin_session', process.env.ADMIN_PASSWORD, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/',
  })
  return respuesta
}

export async function DELETE() {
  const respuesta = NextResponse.json({ ok: true })
  respuesta.cookies.delete('admin_session')
  return respuesta
}
