import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = crearClienteAdmin()
    const { estado, ...resto } = await request.json()
    const datos: Record<string, unknown> = { ...resto }
    if (estado !== undefined) datos.estado = estado

    // Al confirmar un pedido, descontar el stock de cada producto
    if (estado === 'confirmado') {
      const { data: pedidoParaStock } = await admin
        .from('pedidos')
        .select('estado, items')
        .eq('id', params.id)
        .maybeSingle()

      if (pedidoParaStock && pedidoParaStock.estado !== 'confirmado') {
        type ItemConId = { producto_id?: string; cantidad: number }
        const itemsConId = (pedidoParaStock.items as ItemConId[]).filter((i) => i.producto_id)

        if (itemsConId.length > 0) {
          const ids = itemsConId.map((i) => i.producto_id!)
          const { data: productosActuales } = await admin
            .from('productos')
            .select('id, stock')
            .in('id', ids)

          if (productosActuales) {
            for (const item of itemsConId) {
              const prod = productosActuales.find((p) => p.id === item.producto_id)
              if (!prod) continue
              await admin
                .from('productos')
                .update({ stock: Math.max(0, prod.stock - item.cantidad) })
                .eq('id', item.producto_id!)
            }
          }
        }
      }
    }

    // Cuando se cancela un pedido, restar los puntos que generó al cliente
    if (estado === 'cancelado') {
      const { data: pedidoActual } = await admin
        .from('pedidos')
        .select('estado, puntos_generados, datos_cliente')
        .eq('id', params.id)
        .maybeSingle()

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
          await admin.from('clientes').update({ puntos_acumulados: nuevos }).eq('id', cliente.id)
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
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
