import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = crearClienteAdmin()
    const body = await request.json()
    const { ajuste_puntos, concepto, ...camposDirectos } = body

    if (ajuste_puntos !== undefined && ajuste_puntos !== 0) {
      const { data: cliente, error: getError } = await admin
        .from('clientes')
        .select('puntos_acumulados')
        .eq('id', params.id)
        .maybeSingle()

      if (getError) return NextResponse.json({ error: getError.message }, { status: 500 })
      if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

      camposDirectos.puntos_acumulados = Math.max(0, cliente.puntos_acumulados + ajuste_puntos)

      const motivo = concepto?.trim() ||
        (ajuste_puntos > 0 ? 'Ajuste manual' : 'Penalización manual')
      await admin.from('historial_puntos').insert({
        cliente_id: params.id,
        concepto: motivo,
        puntos: ajuste_puntos,
      })
    }

    if (camposDirectos.puntos_canjeados !== undefined) {
      const { data: actual } = await admin
        .from('clientes')
        .select('puntos_canjeados')
        .eq('id', params.id)
        .maybeSingle()

      const delta = (camposDirectos.puntos_canjeados as number) - (actual?.puntos_canjeados ?? 0)
      if (delta > 0) {
        await admin.from('historial_puntos').insert({
          cliente_id: params.id,
          concepto: 'Canje de premio',
          puntos: -delta,
        })
      }
    }

    const { error: updateError } = await admin
      .from('clientes')
      .update(camposDirectos)
      .eq('id', params.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    const { data, error: selectError } = await admin
      .from('clientes')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (selectError) return NextResponse.json({ error: selectError.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = crearClienteAdmin()

  try {
    const { error } = await admin.rpc('eliminar_cliente', { p_id: params.id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
