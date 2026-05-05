import { NextResponse } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = crearClienteAdmin()
    const cambios = await request.json()

    const { data, error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, hint: error.hint },
        { status: 500 }
      )
    }
    return NextResponse.json(data)
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = crearClienteAdmin()
    const { error } = await supabase.from('productos').delete().eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, hint: error.hint },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
