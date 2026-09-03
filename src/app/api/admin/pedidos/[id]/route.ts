import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'
import { variantesTelefono } from '@/lib/telefono'
import { descontarStock } from '@/lib/ventas'
import type { EstadoPedido, ItemPedido } from '@/types'

export const dynamic = 'force-dynamic'

const ESTADOS_VALIDOS: EstadoPedido[] = ['pendiente', 'confirmado', 'cancelado']

/**
 * Cambia el estado de un pedido. Es lo único que deja tocar.
 *
 * El middleware le da acceso también a las empleadas, así que antes —cuando
 * volcaba el body entero al UPDATE— cualquiera con la clave de empleadas podía
 * mandar `{"total": 1}` o `{"items": []}` y reescribir el pedido.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = crearClienteAdmin()

    let estado: unknown
    try {
      estado = (await request.json())?.estado
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    if (!ESTADOS_VALIDOS.includes(estado as EstadoPedido)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    // Al confirmar un pedido, descontar el stock de cada producto
    if (estado === 'confirmado') {
      const { data: pedidoParaStock } = await admin
        .from('pedidos')
        .select('estado, items')
        .eq('id', params.id)
        .maybeSingle()

      if (pedidoParaStock && pedidoParaStock.estado !== 'confirmado') {
        await descontarStock(admin, pedidoParaStock.items as ItemPedido[])
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
      // Por dígitos y no por igualdad exacta: el cliente pudo haber escrito el
      // número con otro formato en el pedido que en el que lo dio de alta.
      const variantes = telefono ? variantesTelefono(telefono) : []

      if (!yaCancelado && puntosARestar > 0 && variantes.length > 0) {
        const { data: encontrados } = await admin
          .from('clientes')
          .select('id, puntos_acumulados')
          .in('telefono_digitos', variantes)
          .order('created_at', { ascending: true })

        const cliente = encontrados?.[0]

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
      .update({ estado })
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
