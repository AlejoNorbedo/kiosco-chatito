import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sesionAdmin = request.cookies.get('admin_session')?.value
  const passwordAdmin = process.env.ADMIN_PASSWORD
  const esAdmin = !!passwordAdmin && sesionAdmin === passwordAdmin

  const sesionEmpleada = request.cookies.get('empleada_session')?.value
  const passwordEmpleada = process.env.EMPLEADA_PASSWORD
  const esEmpleada = !!passwordEmpleada && sesionEmpleada === passwordEmpleada

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
    if (!esAdmin && !esEmpleada) {
      return new NextResponse(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return NextResponse.next()
  }

  // Resto de rutas admin: solo admin
  if (!esAdmin) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin(.*)', '/api/admin(.*)', '/empleada(.*)', '/api/empleada(.*)'],
}
