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
