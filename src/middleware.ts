import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sesion = request.cookies.get('admin_session')?.value
  const passwordEsperado = process.env.ADMIN_PASSWORD
  const autenticado = !!passwordEsperado && sesion === passwordEsperado

  // Página de login: si ya está autenticado mandar al panel, si no dejar pasar
  if (pathname.startsWith('/admin/login')) {
    if (autenticado) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Sin sesión válida
  if (!autenticado) {
    // Las API routes devuelven 401 JSON, no un redirect HTML
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Regex en vez de :path* — matchea /admin, /admin/, /admin/login, etc.
  matcher: ['/admin(.*)', '/api/admin(.*)'],
}
