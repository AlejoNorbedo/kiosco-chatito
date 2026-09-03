import { NextResponse } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'
import type { DatosCheckout, ItemPedido } from '@/types'

/**
 * Alta de pedido. Es la única vía por la que entra un pedido del cliente.
 *
 * Antes el navegador insertaba directo en Supabase con el total que él mismo
 * calculaba, y pedía los puntos a un endpoint público pasándole el monto. Con
 * la consola abierta se podía cargar un pedido de $1 o regalarse puntos. Acá
 * el navegador solo manda qué producto y cuántas unidades: los precios, el
 * total y los puntos se recalculan contra la base.
 */

const MAX_ITEMS = 100
const MAX_CANTIDAD = 99

type ItemEntrante = { producto_id: string; cantidad: number }

function recortar(valor: unknown, largo: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, largo) : ''
}

function parsearItems(crudo: unknown): ItemEntrante[] | null {
  if (!Array.isArray(crudo) || crudo.length === 0 || crudo.length > MAX_ITEMS) return null

  const items: ItemEntrante[] = []
  for (const item of crudo) {
    const id = item?.producto_id
    const cantidad = item?.cantidad
    if (typeof id !== 'string' || !id) return null
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) return null
    items.push({ producto_id: id, cantidad })
  }
  return items
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

    const [{ data: productos, error: errorProductos }, { data: config, error: errorConfig }] =
      await Promise.all([
        admin
          .from('productos')
          .select('id, nombre, precio, precio_oferta, activo, suma_puntos, recargo_transferencia')
          .in(
            'id',
            items.map((i) => i.producto_id)
          ),
        admin.from('configuracion').select('*').single(),
      ])

    if (errorProductos || errorConfig || !config) {
      return NextResponse.json({ error: 'No pudimos procesar el pedido' }, { status: 500 })
    }

    if (config.telefono_requerido && !datos.telefono) {
      return NextResponse.json({ error: 'El teléfono es obligatorio' }, { status: 400 })
    }

    const porId = new Map((productos ?? []).map((p) => [p.id, p]))

    let subtotal = 0
    let subtotalRecargable = 0
    let subtotalConPuntos = 0
    const itemsPedido: ItemPedido[] = []

    for (const item of items) {
      const producto = porId.get(item.producto_id)
      if (!producto || !producto.activo) {
        return NextResponse.json(
          { error: 'Alguno de los productos ya no está disponible. Actualizá la página.' },
          { status: 409 }
        )
      }

      const precio = producto.precio_oferta ?? producto.precio
      const importe = precio * item.cantidad

      subtotal += importe
      if (producto.recargo_transferencia) subtotalRecargable += importe
      if (producto.suma_puntos) subtotalConPuntos += importe

      itemsPedido.push({
        producto_id: producto.id,
        nombre: producto.nombre,
        precio,
        cantidad: item.cantidad,
      })
    }

    const montoMinimo = config.monto_minimo ?? 0
    if (montoMinimo > 0 && subtotal < montoMinimo) {
      return NextResponse.json(
        { error: `El pedido mínimo es de $${montoMinimo.toLocaleString('es-AR')}` },
        { status: 400 }
      )
    }

    const costoEnvio = datos.tipoEntrega === 'envio' ? config.costo_envio ?? 0 : 0
    const recargoPct = config.recargo_transferencia_pct ?? 0
    const recargo =
      datos.metodoPago === 'transferencia' && recargoPct > 0 && subtotalRecargable > 0
        ? Math.round((subtotalRecargable * recargoPct) / 100)
        : 0
    const total = subtotal + costoEnvio + recargo

    const puntosPorMonto = config.puntos_por_monto ?? 0
    const puntosGenerados =
      puntosPorMonto > 0 && datos.telefono && subtotalConPuntos > 0
        ? Math.floor(subtotalConPuntos / puntosPorMonto)
        : 0

    const { data: pedido, error: errorPedido } = await admin
      .from('pedidos')
      .insert({
        items: itemsPedido,
        total,
        datos_cliente: datos,
        puntos_generados: puntosGenerados,
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
        puntosAcumulados = await acreditarPuntos(admin, datos, puntosGenerados)
      } catch {
        puntosAcumulados = 0
      }
    }

    return NextResponse.json({
      ok: true,
      pedido_id: pedido.id,
      items: itemsPedido,
      subtotal,
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

type ClienteAdmin = ReturnType<typeof crearClienteAdmin>

async function acreditarPuntos(
  admin: ClienteAdmin,
  datos: DatosCheckout,
  puntos: number
): Promise<number> {
  const { data: existente } = await admin
    .from('clientes')
    .select('id, puntos_acumulados')
    .eq('telefono', datos.telefono)
    .maybeSingle()

  let clienteId: string
  let acumulados: number

  if (existente) {
    acumulados = existente.puntos_acumulados + puntos
    clienteId = existente.id
    await admin
      .from('clientes')
      .update({ nombre: datos.nombre, puntos_acumulados: acumulados })
      .eq('id', existente.id)
  } else {
    acumulados = puntos
    const { data: nuevo } = await admin
      .from('clientes')
      .insert({ telefono: datos.telefono, nombre: datos.nombre, puntos_acumulados: acumulados })
      .select('id')
      .single()
    if (!nuevo) return 0
    clienteId = nuevo.id
  }

  await admin.from('historial_puntos').insert({ cliente_id: clienteId, concepto: 'Compra', puntos })

  return acumulados
}
