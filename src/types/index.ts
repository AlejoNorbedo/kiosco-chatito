export type Producto = {
  id: string
  nombre: string
  precio: number
  categoria: string
  imagen_url: string | null
  activo: boolean
}

export type ItemCarrito = {
  producto: Producto
  cantidad: number
}
