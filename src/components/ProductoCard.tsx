'use client'

import Image from 'next/image'
import type { Producto, ItemCarrito } from '@/types'

type Props = {
  producto: Producto
  itemEnCarrito: ItemCarrito | undefined
  onAgregar: (producto: Producto) => void
  onQuitar: (productoId: string) => void
}

export default function ProductoCard({
  producto,
  itemEnCarrito,
  onAgregar,
  onQuitar,
}: Props) {
  const cantidad = itemEnCarrito?.cantidad ?? 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Imagen del producto */}
      <div className="relative h-40 bg-gray-50">
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">
            🛍️
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="font-medium text-gray-800 text-sm leading-tight line-clamp-2">
          {producto.nombre}
        </p>
        <p className="text-green-600 font-bold text-base">
          ${producto.precio.toLocaleString('es-AR')}
        </p>

        {/* Control de cantidad */}
        <div className="mt-auto">
          {cantidad === 0 ? (
            <button
              onClick={() => onAgregar(producto)}
              className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
            >
              Agregar
            </button>
          ) : (
            <div className="flex items-center justify-between bg-green-50 rounded-xl p-1">
              <button
                onClick={() => onQuitar(producto.id)}
                className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-green-700 font-bold text-lg active:scale-95 transition-transform"
              >
                −
              </button>
              <span className="font-bold text-green-700">{cantidad}</span>
              <button
                onClick={() => onAgregar(producto)}
                className="w-8 h-8 flex items-center justify-center bg-green-500 rounded-lg shadow-sm text-white font-bold text-lg active:scale-95 transition-transform"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
