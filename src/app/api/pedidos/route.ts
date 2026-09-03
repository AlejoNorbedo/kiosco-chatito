import { NextResponse } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'
import { acreditarPuntos, calcularRecargo, parsearItems, resolverItems } from '@/lib/ventas'
import type { DatosCheckout } from '@/types'

/**
 * Alta de pedido online. Es la única vía por la que entra un pedido del cliente.
 *
 * El navegador solo manda qué producto y cuántas unidades: los precios, el
 * total y los puntos se recalculan contra la base. Antes insertaba directo en
 * Supabase con el total que él mismo calculaba, así que con la consola abierta
 * se podía cargar un pedido de $1 o regalarse puntos.
 *
 * La venta de mostrador tiene su propio endpoint en /api/admin/pos, pero ambos
 * comparten los cálculos en lib/ventas.
 */

function recortar(valor: unknown, largo: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, largo) : ''
}

function parsearDatos(crudo: unknown): DatosCheckout | null {
  if (!crudo || typeof crudo !== 'object') return null
  const d = crudo as Record<string, unknown>

  const nombre = recortar(d.nombre, 120)
  if (!nombre) return null

  const tipoEntrega = d.tipoEntrega === 'envio' ? 'envio' : 'retiro'
  const metodoPago = d.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo'

  const direccion = recortar(d.direccion, 200)
  const entreCalles = recortar(d.entreCalles, 200)
  if (tipoEntrega === 'envio' && (!direccion || !entreCalles)) return null

  return {
    nombre,
    tipoEntrega,
    direccion,
    entreCalles,
    metodoPago,
    conCuanto: recortar(d.conCuanto, 20),
    telefono: recortar(d.telefono, 40),
    aclaraciones: recortar(d.aclaraciones, 500),
  }
}

export async function POST(request: Request) {
  try {
    let cuerpo: { items?: unknown; datos?: unknown }
    try {
      cuerpo = await request.json()
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const items = parsearItems(cuerpo.items)
    if (!items) return NextResponse.json({ error: 'El pedido no es válido' }, { status: 400 })

    const datos = parsearDatos(cuerpo.datos)
    if (!datos) return NextResponse.json({ error: 'Faltan datos del pedido' }, { status: 400 })

    const admin = crearClienteAdmin()

    const [resueltos, { data: config, error: errorConfig }] = await Promise.all([
      resolverItems(admin, items),
      admin.from('configuracion').select('*').single(),
    ])

    if (errorConfig || !config) {
      return NextResponse.json({ error: 'No pudimos procesar el pedido' }, { status: 500 })
    }

    if (!resueltos) {
      return NextResponse.json(
        { error: 'Alguno de los productos ya no está disponible. Actualizá la página.' },
        { status: 409 }
      )
    }

    if (config.telefono_requerido && !datos.telefono) {
      return NextResponse.json({ error: 'El teléfono es obligatorio' }, { status: 400 })
    }

    const montoMinimo = config.monto_minimo ?? 0
    if (montoMinimo > 0 && resueltos.subtotal < montoMinimo) {
      return NextResponse.json(
        { error: `El pedido mínimo es de $${montoMinimo.toLocaleString('es-AR')}` },
        { status: 400 }
      )
    }

    const costoEnvio = datos.tipoEntrega === 'envio' ? config.costo_envio ?? 0 : 0
    const recargoPct = config.recargo_transferencia_pct ?? 0
    const recargo = calcularRecargo(resueltos.subtotalRecargable, recargoPct, datos.metodoPago)
    const total = resueltos.subtotal + costoEnvio + recargo

    const puntosPorMonto = config.puntos_por_monto ?? 0
    const puntosGenerados =
      puntosPorMonto > 0 && datos.telefono && resueltos.subtotalConPuntos > 0
        ? Math.floor(resueltos.subtotalConPuntos / puntosPorMonto)
        : 0

    const { data: pedido, error: errorPedido } = await admin
      .from('pedidos')
      .insert({
        items: resueltos.itemsPedido,
        total,
        datos_cliente: datos,
        puntos_generados: puntosGenerados,
        canal: 'whatsapp',
      })
      .select('id')
      .single()

    if (errorPedido || !pedido) {
      return NextResponse.json({ error: 'No pudimos registrar el pedido' }, { status: 500 })
    }

    // Los puntos no deben tumbar el pedido: si fallan, el admin los ajusta a mano.
    let puntosAcumulados = 0
    if (puntosGenerados > 0) {
      try {
        puntosAcumulados = await acreditarPuntos(
          admin,
          { telefono: datos.telefono, nombre: datos.nombre },
          puntosGenerados
        )
      } catch {
        puntosAcumulados = 0
      }
    }

    return NextResponse.json({
      ok: true,
      pedido_id: pedido.id,
      items: resueltos.itemsPedido,
      subtotal: resueltos.subtotal,
      costo_envio: costoEnvio,
      recargo,
      recargo_pct: recargoPct,
      total,
      puntos_generados: puntosGenerados,
      puntos_acumulados: puntosAcumulados,
    })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
