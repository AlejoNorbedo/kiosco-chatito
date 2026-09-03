import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_POR_ROL, tokenEsValido } from '@/lib/sesion'

function noAutorizado() {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const [esAdmin, esEmpleada] = await Promise.all([
    tokenEsValido(request.cookies.get(COOKIE_POR_ROL.admin)?.value, 'admin'),
    tokenEsValido(request.cookies.get(COOKIE_POR_ROL.empleada)?.value, 'empleada'),
  ])

  // ─── Rutas /empleada ───────────────────────────────────────────────────────

  if (pathname.startsWith('/empleada/login')) {
    if (esEmpleada) return NextResponse.redirect(new URL('/empleada', request.url))
    return NextResponse.next()
  }

  if (pathname.startsWith('/empleada')) {
    if (!esEmpleada) return NextResponse.redirect(new URL('/empleada/login', request.url))
    return NextResponse.next()
  }

  // ─── Rutas /api/empleada (auth) — siempre accesibles ──────────────────────

  if (pathname.startsWith('/api/empleada')) {
    return NextResponse.next()
  }

  // ─── Rutas /admin ──────────────────────────────────────────────────────────

  if (pathname.startsWith('/admin/login')) {
    if (esAdmin) return NextResponse.redirect(new URL('/admin', request.url))
    return NextResponse.next()
  }

  // Las empleadas pueden acceder a los pedidos (GET lista + PATCH estado)
  if (pathname.startsWith('/api/admin/pedidos')) {
    if (!esAdmin && !esEmpleada) return noAutorizado()
    return NextResponse.next()
  }

  // Resto de rutas admin: solo admin
  if (!esAdmin) {
    if (pathname.startsWith('/api/')) return noAutorizado()
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin(.*)', '/api/admin(.*)', '/empleada(.*)', '/api/empleada(.*)'],
}
