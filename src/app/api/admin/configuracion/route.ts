import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const admin = crearClienteAdmin()
  const { data, error } = await admin.from('configuracion').select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const admin = crearClienteAdmin()
  const datos = await request.json()
  const { data, error } = await admin
    .from('configuracion')
    .update(datos)
    .eq('id', 1)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
