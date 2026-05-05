'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useCarrito } from '@/hooks/useCarrito'
import ProductoCard from '@/components/ProductoCard'
import Carrito from '@/components/Carrito'
import type { Producto } from '@/types'

export default function PaginaCatalogo() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargandoProductos, setCargandoProductos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos')
  const [carritoAbierto, setCarritoAbierto] = useState(false)

  const { items, agregar, quitar, vaciar, totalItems, totalPrecio, cargando: cargandoCarrito } =
    useCarrito()

  // Cargar productos desde Supabase
  useEffect(() => {
    async function cargarProductos() {
      setCargandoProductos(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('categoria')
        .order('nombre')

      if (err) {
        setError('No se pudieron cargar los productos. Intentá de nuevo.')
      } else {
        setProductos(data ?? [])
      }
      setCargandoProductos(false)
    }

    cargarProductos()
  }, [])

  // Categorías únicas derivadas de los productos
  const categorias = useMemo(() => {
    const unicas = Array.from(new Set(productos.map((p) => p.categoria)))
    return ['Todos', ...unicas.sort()]
  }, [productos])

  // Productos filtrados por categoría seleccionada
  const productosFiltrados = useMemo(() => {
    if (categoriaActiva === 'Todos') return productos
    return productos.filter((p) => p.categoria === categoriaActiva)
  }, [productos, categoriaActiva])

  const cargando = cargandoProductos || cargandoCarrito

  return (
    <main className="min-h-screen pb-24">
      {/* Cabecera */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Kiosco Chatito</h1>
            <p className="text-xs text-gray-500">Pedí y te avisamos por WhatsApp</p>
          </div>

          {/* Botón carrito */}
          <button
            onClick={() => setCarritoAbierto(true)}
            className="relative bg-green-500 hover:bg-green-600 text-white rounded-2xl px-4 py-2 flex items-center gap-2 transition-colors"
          >
            <span className="text-lg">🛒</span>
            {totalItems > 0 && (
              <>
                <span className="font-bold text-sm">{totalItems}</span>
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
              </>
            )}
          </button>
        </div>

        {/* Filtro de categorías */}
        {categorias.length > 1 && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoriaActiva === cat
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Contenido */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {cargando && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-56 animate-pulse border border-gray-100"
              />
            ))}
          </div>
        )}

        {!cargando && error && (
          <div className="text-center py-16">
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-green-600 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && productosFiltrados.length === 0 && (
          <p className="text-center text-gray-400 py-16">
            No hay productos en esta categoría.
          </p>
        )}

        {!cargando && !error && productosFiltrados.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {productosFiltrados.map((producto) => (
              <ProductoCard
                key={producto.id}
                producto={producto}
                itemEnCarrito={items.find((i) => i.producto.id === producto.id)}
                onAgregar={agregar}
                onQuitar={quitar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Barra inferior cuando hay items en el carrito */}
      {!carritoAbierto && totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-30">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setCarritoAbierto(true)}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl flex items-center justify-between px-5 transition-colors"
            >
              <span className="bg-green-600 rounded-xl px-2 py-0.5 text-sm">
                {totalItems}
              </span>
              <span>Ver pedido</span>
              <span className="font-bold">
                ${totalPrecio.toLocaleString('es-AR')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Panel del carrito */}
      {carritoAbierto && (
        <Carrito
          items={items}
          totalPrecio={totalPrecio}
          onAgregar={agregar}
          onQuitar={quitar}
          onVaciar={vaciar}
          onCerrar={() => setCarritoAbierto(false)}
        />
      )}
    </main>
  )
}
