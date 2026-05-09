export type Producto = {
  id: string
  nombre: string
  precio: number
  categoria: string
  imagen_url: string | null
  activo: boolean
  stock: number
  created_at: string
}

export type ItemCarrito = {
  producto: Producto
  cantidad: number
}

export type ItemPedido = {
  nombre: string
  precio: number
  cantidad: number
}

export type EstadoPedido = 'pendiente' | 'confirmado' | 'cancelado'

export type Pedido = {
  id: string
  items: ItemPedido[]
  total: number
  created_at: string
  datos_cliente?: DatosCheckout
  estado: EstadoPedido
  puntos_generados: number
}

export type Configuracion = {
  costo_envio: number
  tiempo_entrega_activo: boolean
  tiempo_entrega_texto: string
  telefono_requerido: boolean
  monto_minimo: number
  puntos_por_monto: number
  puntos_para_canje: number
  mensaje_canje: string
}

export type Cliente = {
  id: string
  telefono: string
  nombre: string
  puntos_acumulados: number
  puntos_canjeados: number
  created_at: string
}

export type HistorialPunto = {
  id: string
  cliente_id: string
  concepto: string
  puntos: number
  created_at: string
}

export type DatosCheckout = {
  nombre: string
  tipoEntrega: 'retiro' | 'envio'
  direccion: string
  entreCalles: string
  metodoPago: 'efectivo' | 'transferencia'
  conCuanto: string
  telefono: string
  aclaraciones: string
}
