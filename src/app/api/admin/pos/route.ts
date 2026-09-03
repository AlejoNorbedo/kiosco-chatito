import { NextResponse } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'
import {
  acreditarPuntos,
  calcularRecargo,
  descontarStock,
  parsearItems,
  resolverItems,
} from '@/lib/ventas'
import type { DatosCheckout } from '@/types'

/**
 * Venta cobrada en el mostrador.
 *
 * Se guarda en la misma tabla que los pedidos de WhatsApp, con `canal` en
 * 'presencial', para que compartan stock, cierre de caja y fidelización.
 *
 * A diferencia del pedido online, acá la plata ya se cobró: entra directo como
 * 'confirmado' y descuenta el stock en el momento, sin pasar por el flujo de
 * confirmación del panel. Tampoco hay envío ni monto mínimo — es venta directa.
 *
 * El middleware deja entrar a admin y a empleadas: son las que atienden.
 */

export const dynamic = 'force-dynamic'

const NOMBRE_POR_DEFECTO = 'Venta en mostrador'

function recortar(valor: unknown, largo: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, largo) : ''
}

export async function POST(request: Request) {
  try {
    let cuerpo: {
      items?: unknown
      metodoPago?: unknown
      telefono?: unknown
      nombre?: unknown
      recibido?: unknown
    }
    try {
      cuerpo = await request.json()
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const items = parsearItems(cuerpo.items)
    if (!items) return NextResponse.json({ error: 'El ticket no es válido' }, { status: 400 })

    const metodoPago = cuerpo.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo'
    const telefono = recortar(cuerpo.telefono, 40)
    const nombre = recortar(cuerpo.nombre, 120) || NOMBRE_POR_DEFECTO

    const admin = crearClienteAdmin()

    const [resueltos, { data: config, error: errorConfig }] = await Promise.all([
      resolverItems(admin, items),
      admin.from('configuracion').select('*').single(),
    ])

    if (errorConfig || !config) {
      return NextResponse.json({ error: 'No pudimos procesar la venta' }, { status: 500 })
    }

    if (!resueltos) {
      return NextResponse.json(
        { error: 'Alguno de los productos ya no está disponible' },
        { status: 409 }
      )
    }

    const recargoPct = config.recargo_transferencia_pct ?? 0
    const recargo = calcularRecargo(resueltos.subtotalRecargable, recargoPct, metodoPago)
    const total = resueltos.subtotal + recargo

    const puntosPorMonto = config.puntos_por_monto ?? 0
    const puntosGenerados =
      puntosPorMonto > 0 && telefono && resueltos.subtotalConPuntos > 0
        ? Math.floor(resueltos.subtotalConPuntos / puntosPorMonto)
        : 0

    const recibido = typeof cuerpo.recibido === 'number' && cuerpo.recibido > 0 ? cuerpo.recibido : 0
    const vuelto = metodoPago === 'efectivo' && recibido > total ? recibido - total : 0

    const datosCliente: DatosCheckout = {
      nombre,
      tipoEntrega: 'retiro',
      direccion: '',
      entreCalles: '',
      metodoPago,
      conCuanto: recibido > 0 ? String(recibido) : '',
      telefono,
      aclaraciones: '',
    }

    const { data: venta, error: errorVenta } = await admin
      .from('pedidos')
      .insert({
        items: resueltos.itemsPedido,
        total,
        datos_cliente: datosCliente,
        puntos_generados: puntosGenerados,
        canal: 'presencial',
        estado: 'confirmado',
      })
      .select('id')
      .single()

    if (errorVenta || !venta) {
      return NextResponse.json({ error: 'No pudimos registrar la venta' }, { status: 500 })
    }

    // Ni el stock ni los puntos deben tumbar una venta ya cobrada: si alguno
    // falla, queda registrada igual y se corrige a mano desde el panel.
    try {
      await descontarStock(admin, resueltos.itemsPedido)
    } catch {
      /* se ajusta desde Productos */
    }

    let puntosAcumulados = 0
    if (puntosGenerados > 0) {
      try {
        puntosAcumulados = await acreditarPuntos(admin, { telefono, nombre }, puntosGenerados)
      } catch {
        puntosAcumulados = 0
      }
    }

    return NextResponse.json({
      ok: true,
      venta_id: venta.id,
      subtotal: resueltos.subtotal,
      recargo,
      recargo_pct: recargoPct,
      total,
      recibido,
      vuelto,
      puntos_generados: puntosGenerados,
      puntos_acumulados: puntosAcumulados,
    })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
