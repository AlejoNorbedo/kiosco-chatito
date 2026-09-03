import { crearClienteAdmin } from '@/lib/supabaseAdmin'
import { variantesTelefono } from '@/lib/telefono'
import type { ItemPedido } from '@/types'

/**
 * Lógica de servidor compartida por las dos formas de vender: el checkout
 * online (`POST /api/pedidos`) y el mostrador (`POST /api/admin/pos`).
 *
 * Vive acá para que los precios, el stock y los puntos se calculen igual en las
 * dos, sin importar por dónde entró la venta.
 */

export type ClienteAdmin = ReturnType<typeof crearClienteAdmin>

export const MAX_ITEMS = 100
export const MAX_CANTIDAD = 99

export type ItemEntrante = { producto_id: string; cantidad: number }

export type ItemsResueltos = {
  itemsPedido: ItemPedido[]
  subtotal: number
  /** Parte del subtotal que paga recargo si se abona con transferencia. */
  subtotalRecargable: number
  /** Parte del subtotal que genera puntos de fidelidad. */
  subtotalConPuntos: number
}

export function parsearItems(crudo: unknown): ItemEntrante[] | null {
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

/**
 * Busca los productos en la base y arma el detalle con los precios reales.
 * El navegador solo manda ids y cantidades: nunca fija un precio.
 */
export async function resolverItems(
  admin: ClienteAdmin,
  items: ItemEntrante[]
): Promise<ItemsResueltos | null> {
  const { data: productos, error } = await admin
    .from('productos')
    .select('id, nombre, precio, precio_oferta, activo, suma_puntos, recargo_transferencia')
    .in(
      'id',
      items.map((i) => i.producto_id)
    )

  if (error) return null

  const porId = new Map((productos ?? []).map((p) => [p.id, p]))

  const resultado: ItemsResueltos = {
    itemsPedido: [],
    subtotal: 0,
    subtotalRecargable: 0,
    subtotalConPuntos: 0,
  }

  for (const item of items) {
    const producto = porId.get(item.producto_id)
    if (!producto || !producto.activo) return null

    const precio = producto.precio_oferta ?? producto.precio
    const importe = precio * item.cantidad

    resultado.subtotal += importe
    if (producto.recargo_transferencia) resultado.subtotalRecargable += importe
    if (producto.suma_puntos) resultado.subtotalConPuntos += importe

    resultado.itemsPedido.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio,
      cantidad: item.cantidad,
    })
  }

  return resultado
}

export function calcularRecargo(
  subtotalRecargable: number,
  porcentaje: number,
  metodoPago: string
): number {
  if (metodoPago !== 'transferencia' || porcentaje <= 0 || subtotalRecargable <= 0) return 0
  return Math.round((subtotalRecargable * porcentaje) / 100)
}

/** Descuenta el stock de una venta ya cobrada o confirmada. Nunca baja de 0. */
export async function descontarStock(admin: ClienteAdmin, items: ItemPedido[]): Promise<void> {
  const conId = items.filter((i) => i.producto_id)
  if (conId.length === 0) return

  const { data: actuales } = await admin
    .from('productos')
    .select('id, stock')
    .in(
      'id',
      conId.map((i) => i.producto_id!)
    )

  if (!actuales) return

  for (const item of conId) {
    const producto = actuales.find((p) => p.id === item.producto_id)
    if (!producto) continue
    await admin
      .from('productos')
      .update({ stock: Math.max(0, producto.stock - item.cantidad) })
      .eq('id', item.producto_id!)
  }
}

/**
 * Suma puntos al cliente, creándolo si es la primera vez.
 *
 * La búsqueda va por `telefono_digitos` y no por el teléfono tal cual: la misma
 * persona escribe su número distinto cada vez, y por igualdad exacta se le
 * creaba un cliente nuevo —con los puntos en cero— en cada formato.
 * Devuelve el total acumulado, o 0 si no se pudo registrar.
 */
export async function acreditarPuntos(
  admin: ClienteAdmin,
  cliente: { telefono: string; nombre: string },
  puntos: number
): Promise<number> {
  const variantes = variantesTelefono(cliente.telefono)
  if (variantes.length === 0) return 0

  const { data: encontrados } = await admin
    .from('clientes')
    .select('id, puntos_acumulados')
    .in('telefono_digitos', variantes)
    .order('created_at', { ascending: true })

  const existente = encontrados?.[0] ?? null

  let clienteId: string
  let acumulados: number

  if (existente) {
    acumulados = existente.puntos_acumulados + puntos
    clienteId = existente.id
    await admin
      .from('clientes')
      .update({ nombre: cliente.nombre, puntos_acumulados: acumulados })
      .eq('id', existente.id)
  } else {
    acumulados = puntos
    const { data: nuevo } = await admin
      .from('clientes')
      .insert({
        telefono: cliente.telefono,
        nombre: cliente.nombre,
        puntos_acumulados: acumulados,
      })
      .select('id')
      .single()
    if (!nuevo) return 0
    clienteId = nuevo.id
  }

  await admin.from('historial_puntos').insert({ cliente_id: clienteId, concepto: 'Compra', puntos })

  return acumulados
}
