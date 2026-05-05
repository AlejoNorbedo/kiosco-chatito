import { NextResponse } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const supabase = crearClienteAdmin()
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('categoria')
      .order('nombre')

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

export async function POST(request: Request) {
  try {
    const supabase = crearClienteAdmin()
    const cuerpo = await request.json()

    const { data, error } = await supabase
      .from('productos')
      .insert(cuerpo)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, hint: error.hint },
        { status: 500 }
      )
    }
    return NextResponse.json(data, { status: 201 })
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
