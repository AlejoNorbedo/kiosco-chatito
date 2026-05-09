import { NextResponse } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = crearClienteAdmin()
    const { data, error } = await admin
      .from('clientes')
      .select('*')
      .order('puntos_acumulados', { ascending: false })

    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
