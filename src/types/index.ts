export type Producto = {
  id: string
  nombre: string
  precio: number
  categoria: string
  imagen_url: string | null
  activo: boolean
  stock: number
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

export type Pedido = {
  id: string
  items: ItemPedido[]
  total: number
  created_at: string
}

export type Configuracion = {
  costo_envio: number
  tiempo_entrega_activo: boolean
  tiempo_entrega_texto: string
  telefono_requerido: boolean
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
