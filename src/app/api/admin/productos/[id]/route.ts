import { NextResponse } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = crearClienteAdmin()
  const cambios = await request.json()

  const { data, error } = await supabase
    .from('productos')
    .update(cambios)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = crearClienteAdmin()
  const { error } = await supabase.from('productos').delete().eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
