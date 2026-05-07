import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const supabase = crearClienteAdmin()
    let query = supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })

    if (desde && hasta) {
      query = query.gte('created_at', desde).lte('created_at', hasta)
    } else {
      query = query.limit(50)
    }

    const estado = searchParams.get('estado')
    if (estado) query = query.eq('estado', estado)

    const { data, error } = await query

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
