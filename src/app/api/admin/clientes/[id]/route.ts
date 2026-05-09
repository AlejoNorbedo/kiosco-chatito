import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = crearClienteAdmin()
    const body = await request.json()
    const { ajuste_puntos, concepto, ...camposDirectos } = body

    // Ajuste manual de puntos: recalcula puntos_acumulados y loggea historial
    if (ajuste_puntos !== undefined && ajuste_puntos !== 0) {
      const { data: cliente, error: getError } = await admin
        .from('clientes')
        .select('puntos_acumulados')
        .eq('id', params.id)
        .single()

      if (getError) return NextResponse.json({ error: getError.message }, { status: 500 })

      const nuevos = Math.max(0, cliente.puntos_acumulados + ajuste_puntos)
      camposDirectos.puntos_acumulados = nuevos

      const motivo = concepto?.trim() ||
        (ajuste_puntos > 0 ? 'Ajuste manual' : 'Penalización manual')
      await admin.from('historial_puntos').insert({
        cliente_id: params.id,
        concepto: motivo,
        puntos: ajuste_puntos,
      })
    }

    // Canje: detecta el delta y loggea historial
    if (camposDirectos.puntos_canjeados !== undefined) {
      const { data: actual } = await admin
        .from('clientes')
        .select('puntos_canjeados')
        .eq('id', params.id)
        .single()

      const delta = (camposDirectos.puntos_canjeados as number) - (actual?.puntos_canjeados ?? 0)
      if (delta > 0) {
        await admin.from('historial_puntos').insert({
          cliente_id: params.id,
          concepto: 'Canje de premio',
          puntos: -delta,
        })
      }
    }

    const { data, error } = await admin
      .from('clientes')
      .update(camposDirectos)
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = crearClienteAdmin()
    const { error } = await admin
      .from('clientes')
      .delete()
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
