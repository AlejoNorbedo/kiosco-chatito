import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = crearClienteAdmin()
    const datos = await request.json()

    // Cuando se cancela un pedido, restar los puntos que generó al cliente
    if (datos.estado === 'cancelado') {
      const { data: pedidoActual } = await admin
        .from('pedidos')
        .select('estado, puntos_generados, datos_cliente')
        .eq('id', params.id)
        .single()

      const yaCancelado = pedidoActual?.estado === 'cancelado'
      const puntosARestar = pedidoActual?.puntos_generados ?? 0
      const telefono = (pedidoActual?.datos_cliente as { telefono?: string } | null)?.telefono?.trim()

      if (!yaCancelado && puntosARestar > 0 && telefono) {
        const { data: cliente } = await admin
          .from('clientes')
          .select('id, puntos_acumulados')
          .eq('telefono', telefono)
          .maybeSingle()

        if (cliente) {
          const nuevos = Math.max(0, cliente.puntos_acumulados - puntosARestar)
          await admin
            .from('clientes')
            .update({ puntos_acumulados: nuevos })
            .eq('id', cliente.id)

          await admin.from('historial_puntos').insert({
            cliente_id: cliente.id,
            concepto: 'Pedido cancelado',
            puntos: -puntosARestar,
          })
        }
      }
    }

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
