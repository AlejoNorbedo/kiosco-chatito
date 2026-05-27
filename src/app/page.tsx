'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useCarrito } from '@/hooks/useCarrito'
import ProductoCard from '@/components/ProductoCard'
import Carrito from '@/components/Carrito'
import ModalInstalacion from '@/components/ModalInstalacion'
import type { Producto, Configuracion } from '@/types'

function estaAbierto(config: Configuracion): boolean {
  if (!config.horario_activo) return true
  const ahora = new Date()
  const dia = ahora.getDay()
  if (!(config.dias_activos ?? [0,1,2,3,4,5,6]).includes(dia)) return false
  const [hAp, mAp] = config.horario_apertura.split(':').map(Number)
  const [hCi, mCi] = config.horario_cierre.split(':').map(Number)
  const min = ahora.getHours() * 60 + ahora.getMinutes()
  return min >= hAp * 60 + mAp && min < hCi * 60 + mCi
}

type OrdenProductos = 'creacion' | 'az' | 'za' | 'menor_precio' | 'mayor_precio'

function sortearProductos(lista: Producto[], orden: OrdenProductos): Producto[] {
  const c = [...lista]
  switch (orden) {
    case 'az': return c.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    case 'za': return c.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'))
    case 'menor_precio': return c.sort((a, b) => (a.precio_oferta ?? a.precio) - (b.precio_oferta ?? b.precio))
    case 'mayor_precio': return c.sort((a, b) => (b.precio_oferta ?? b.precio) - (a.precio_oferta ?? a.precio))
    default: return c.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
}

export default function PaginaCatalogo() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargandoProductos, setCargandoProductos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos')
  const [orden, setOrden] = useState<OrdenProductos>('creacion')
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [configHorario, setConfigHorario] = useState<Pick<Configuracion, 'horario_activo' | 'horario_apertura' | 'horario_cierre' | 'dias_activos'>>({
    horario_activo: false,
    horario_apertura: '09:00',
    horario_cierre: '22:00',
    dias_activos: [0, 1, 2, 3, 4, 5, 6],
  })

  const { items, agregar, quitar, vaciar, totalItems, totalPrecio, cargando: cargandoCarrito } =
    useCarrito()

  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL

  useEffect(() => {
    supabase
      .from('configuracion')
      .select('horario_activo, horario_apertura, horario_cierre, dias_activos')
      .single()
      .then(({ data }) => { if (data) setConfigHorario(data) })
  }, [])

  useEffect(() => {
    async function cargarProductos() {
      setCargandoProductos(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: true })

      if (err) {
        setError('No se pudieron cargar los productos. Intentá de nuevo.')
      } else {
        setProductos(data ?? [])
      }
      setCargandoProductos(false)
    }
    cargarProductos()
  }, [])

  const categorias = useMemo(() => {
    const unicas = Array.from(new Set(productos.map((p) => p.categoria)))
    return ['Todos', ...unicas.sort()]
  }, [productos])

  const productosFiltrados = useMemo(() => {
    let base = productos
    if (busqueda.trim()) {
      const term = busqueda.trim().toLowerCase()
      base = productos.filter((p) => p.nombre.toLowerCase().includes(term))
    } else {
      base = categoriaActiva === 'Todos' ? productos : productos.filter((p) => p.categoria === categoriaActiva)
    }
    return sortearProductos(base, orden)
  }, [productos, categoriaActiva, orden, busqueda])

  const productosDestacados = useMemo(() => {
    if (busqueda.trim() || categoriaActiva !== 'Todos') return []
    return productos.filter((p) => p.destacado)
  }, [productos, busqueda, categoriaActiva])

  const productosAgrupados = useMemo(() => {
    if (categoriaActiva === 'Todos') return null
    const tienenSubcat = productosFiltrados.some((p) => p.subcategoria)
    if (!tienenSubcat) return null
    const sinSubcat = productosFiltrados.filter((p) => !p.subcategoria)
    const grupos = new Map<string, Producto[]>()
    for (const p of productosFiltrados) {
      if (p.subcategoria) {
        if (!grupos.has(p.subcategoria)) grupos.set(p.subcategoria, [])
        grupos.get(p.subcategoria)!.push(p)
      }
    }
    return { sinSubcat, grupos }
  }, [productosFiltrados, categoriaActiva])

  const cargando = cargandoProductos || cargandoCarrito

  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-30">
        {/* Barra principal */}
        <div className="bg-[#CC0000]">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-3 flex items-center justify-between gap-3">
            {/* Branding con logo */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Image
                src="/logo.png"
                alt="Logo Kiosco Chatito"
                width={64}
                height={64}
                className="rounded-2xl flex-shrink-0 ring-2 ring-black/40 shadow-md w-14 h-14 md:w-16 md:h-16"
                priority
              />
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                  Kiosco Chatito
                </h1>
                <p className="text-white/75 text-xs mt-0.5 leading-snug">
                  Realizá tu pedido online y te respondemos a la brevedad por WhatsApp
                </p>
              </div>
            </div>

            {/* Íconos de la derecha */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram del kiosco"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
                >
                  <IconoInstagram />
                </a>
              )}

              <button
                onClick={() => setCarritoAbierto(true)}
                aria-label="Ver carrito"
                className="h-9 px-3 flex items-center gap-1.5 bg-white text-[#CC0000] rounded-xl font-bold text-sm shadow-sm hover:bg-red-50 active:scale-[0.97] transition-all"
              >
                <span className="text-base">🛒</span>
                {totalItems > 0 && (
                  <span className="bg-[#CC0000] text-white text-xs font-extrabold rounded-lg px-1.5 py-0.5 leading-none tabular-nums">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filtro de categorías */}
        {categorias.length > 1 && (
          <div className="bg-white shadow-sm border-b border-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    categoriaActiva === cat
                      ? 'bg-[#CC0000] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Banner cerrado */}
        {configHorario.horario_activo && !estaAbierto(configHorario as Configuracion) && (
          <div className="bg-amber-50 border-b border-amber-200">
            <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2">
              <span className="text-base">🔒</span>
              <p className="text-sm font-semibold text-amber-800">
                Estamos cerrados · Atendemos de {configHorario.horario_apertura} a {configHorario.horario_cierre} hs
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Grilla de productos */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Barra de búsqueda */}
        {!cargando && !error && (
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">🔍</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#CC0000] bg-white"
            />
          </div>
        )}

        {/* Selector de orden */}
        {!cargando && !error && (
          <div className="flex justify-end mb-4">
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenProductos)}
              className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2 outline-none transition-colors cursor-pointer"
            >
              <option value="creacion">Orden de carga</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="menor_precio">Menor precio</option>
              <option value="mayor_precio">Mayor precio</option>
            </select>
          </div>
        )}

        {/* Skeleton de carga */}
        {cargando && (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="h-40 bg-gray-200 animate-pulse" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3.5 bg-gray-200 rounded-full animate-pulse w-4/5" />
                  <div className="h-3.5 bg-gray-200 rounded-full animate-pulse w-1/2" />
                  <div className="h-8 bg-gray-200 rounded-xl animate-pulse mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!cargando && error && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">😕</p>
            <p className="text-gray-600 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-[#CC0000] font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && productosDestacados.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-1.5">
              <span>⭐</span> Destacados
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {productosDestacados.map((producto) => (
                <ProductoCard
                  key={`dest-${producto.id}`}
                  producto={producto}
                  itemEnCarrito={items.find((i) => i.producto.id === producto.id)}
                  onAgregar={agregar}
                  onQuitar={quitar}
                />
              ))}
            </div>
          </div>
        )}

        {!cargando && !error && productosFiltrados.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-gray-500">No hay productos en esta categoría.</p>
          </div>
        )}

        {!cargando && !error && productosFiltrados.length > 0 && (
          productosAgrupados ? (
            <div className="flex flex-col gap-6">
              {productosAgrupados.sinSubcat.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {productosAgrupados.sinSubcat.map((producto) => (
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
              {Array.from(productosAgrupados.grupos.entries()).map(([subcategoria, prods]) => (
                <div key={subcategoria}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                    {subcategoria}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {prods.map((producto) => (
                      <ProductoCard
                        key={producto.id}
                        producto={producto}
                        itemEnCarrito={items.find((i) => i.producto.id === producto.id)}
                        onAgregar={agregar}
                        onQuitar={quitar}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
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
          )
        )}
      </div>

      {/* Barra flotante del carrito */}
      {!carritoAbierto && totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-white/80 backdrop-blur-sm border-t border-gray-100 shadow-2xl z-30">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setCarritoAbierto(true)}
              className="w-full bg-[#CC0000] hover:bg-red-700 active:bg-red-800 text-white font-bold py-3.5 rounded-2xl flex items-center justify-between px-5 transition-colors shadow-lg shadow-red-900/20"
            >
              <span className="bg-white/20 rounded-xl px-2.5 py-1 text-sm font-extrabold tabular-nums">
                {totalItems}
              </span>
              <span className="text-base">Ver pedido</span>
              <span className="font-extrabold tabular-nums">
                ${totalPrecio.toLocaleString('es-AR')}
              </span>
            </button>
          </div>
        </div>
      )}

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

      <ModalInstalacion />
    </main>
  )
}

function IconoInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}
