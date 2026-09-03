import type { Producto } from '@/types'

export type OrdenProductos = 'creacion' | 'az' | 'za' | 'menor_precio' | 'mayor_precio'

/** El precio que se cobra: la oferta manda sobre el precio de lista. */
export function precioEfectivo(producto: Pick<Producto, 'precio' | 'precio_oferta'>): number {
  return producto.precio_oferta ?? producto.precio
}

/**
 * Ordena sin mutar la lista original.
 *
 * Estaba duplicado en el catálogo y en el admin, y las dos copias se habían
 * desincronizado: el catálogo ordenaba por precio efectivo y el admin por
 * precio de lista, así que un producto en oferta aparecía en distinto lugar en
 * cada pantalla. Ahora ambos usan el precio que realmente se cobra.
 */
export function ordenarProductos(lista: Producto[], orden: OrdenProductos): Producto[] {
  const copia = [...lista]
  switch (orden) {
    case 'az':
      return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    case 'za':
      return copia.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'))
    case 'menor_precio':
      return copia.sort((a, b) => precioEfectivo(a) - precioEfectivo(b))
    case 'mayor_precio':
      return copia.sort((a, b) => precioEfectivo(b) - precioEfectivo(a))
    default:
      return copia.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
}
