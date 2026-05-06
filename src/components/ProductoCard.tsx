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
  const agotado = producto.stock === 0

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      {/* Imagen */}
      <div className="relative h-40 bg-gray-50">
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            className={`object-contain p-2 ${agotado ? 'grayscale opacity-50' : ''}`}
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className={`flex items-center justify-center h-full text-4xl ${agotado ? 'opacity-40' : ''}`}>
            🛍️
          </div>
        )}
        {agotado && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-black/65 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
              AGOTADO
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
          {producto.nombre}
        </p>
        <p className="text-[#CC0000] font-extrabold text-base">
          ${producto.precio.toLocaleString('es-AR')}
        </p>

        {/* Control de cantidad */}
        <div className="mt-auto pt-1">
          {agotado ? (
            <button
              disabled
              className="w-full bg-gray-100 text-gray-400 text-sm font-semibold py-2 rounded-xl cursor-not-allowed"
            >
              Agotado
            </button>
          ) : cantidad === 0 ? (
            <button
              onClick={() => onAgregar(producto)}
              className="w-full bg-[#CC0000] hover:bg-red-700 active:scale-[0.97] text-white text-sm font-bold py-2 rounded-xl transition-all"
            >
              Agregar
            </button>
          ) : (
            <div className="flex items-center justify-between bg-red-50 rounded-xl p-1">
              <button
                onClick={() => onQuitar(producto.id)}
                className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#CC0000] font-bold text-lg active:scale-90 transition-transform"
              >
                −
              </button>
              <span className="font-extrabold text-[#CC0000] tabular-nums">{cantidad}</span>
              <button
                onClick={() => onAgregar(producto)}
                className="w-8 h-8 flex items-center justify-center bg-[#CC0000] rounded-lg shadow-sm text-white font-bold text-lg active:scale-90 transition-transform"
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
