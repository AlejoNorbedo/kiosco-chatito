import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = crearClienteAdmin()
    const datos = await request.json()
    const { data, error } = await admin
      .from('pedidos')
      .update(datos)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
