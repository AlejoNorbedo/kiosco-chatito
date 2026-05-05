'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FormularioProducto from '@/components/admin/FormularioProducto'
import type { Producto, Pedido } from '@/types'

type Tab = 'productos' | 'pedidos'

export default function PaginaAdmin() {
  const [tab, setTab] = useState<Tab>('productos')
  const [productos, setProductos] = useState<Producto[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditando, setProductoEditando] = useState<Producto | undefined>()
  const router = useRouter()

  useEffect(() => {
    cargarProductos()
  }, [])

  useEffect(() => {
    if (tab === 'pedidos' && pedidos.length === 0) cargarPedidos()
  }, [tab])

  async function cargarProductos() {
    setCargando(true)
    setError('')
    const res = await fetch('/api/admin/productos')
    if (!res.ok) {
      try {
        const { error: detalle, code } = await res.json()
        setError(detalle ? `${detalle}${code ? ` (${code})` : ''}` : 'Error cargando productos')
      } catch {
        setError('Error cargando productos')
      }
    } else {
      setProductos(await res.json())
    }
    setCargando(false)
  }

  async function cargarPedidos() {
    const res = await fetch('/api/admin/pedidos')
    if (res.ok) setPedidos(await res.json())
  }

  async function cerrarSesion() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  async function guardarProducto(datos: Partial<Producto>) {
    if (productoEditando) {
      const res = await fetch(`/api/admin/productos/${productoEditando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })
      if (!res.ok) throw new Error()
      const actualizado = await res.json()
      setProductos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)))
    } else {
      const res = await fetch('/api/admin/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })
      if (!res.ok) throw new Error()
      const nuevo = await res.json()
      setProductos((prev) => [...prev, nuevo])
    }
    cerrarModal()
  }

  async function toggleActivo(producto: Producto) {
    const res = await fetch(`/api/admin/productos/${producto.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !producto.activo }),
    })
    if (res.ok) {
      const actualizado = await res.json()
      setProductos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)))
    }
  }

  async function eliminarProducto(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    const res = await fetch(`/api/admin/productos/${id}`, { method: 'DELETE' })
    if (res.ok) setProductos((prev) => prev.filter((p) => p.id !== id))
  }

  function abrirNuevo() {
    setProductoEditando(undefined)
    setModalAbierto(true)
  }

  function abrirEditar(producto: Producto) {
    setProductoEditando(producto)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setProductoEditando(undefined)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cabecera */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Panel Admin</h1>
          <button
            onClick={cerrarSesion}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-0">
          {(['productos', 'pedidos'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors ${
                tab === t
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'productos' ? 'Productos' : 'Pedidos'}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* TAB PRODUCTOS */}
        {tab === 'productos' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">{productos.length} productos</p>
              <button
                onClick={abrirNuevo}
                className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
              >
                + Agregar
              </button>
            </div>

            {cargando && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl h-20 animate-pulse border border-gray-100" />
                ))}
              </div>
            )}

            {!cargando && error && (
              <p className="text-center text-red-500 py-8">{error}</p>
            )}

            {!cargando && !error && (
              <div className="flex flex-col gap-2">
                {productos.map((producto) => (
                  <div
                    key={producto.id}
                    className={`bg-white rounded-xl border p-4 flex items-center gap-3 transition-opacity ${
                      !producto.activo ? 'opacity-50' : 'border-gray-100'
                    }`}
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {producto.nombre}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {producto.categoria} · ${producto.precio.toLocaleString('es-AR')} ·{' '}
                        <span className={producto.stock === 0 ? 'text-red-500 font-medium' : ''}>
                          Stock: {producto.stock}
                        </span>
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle activo */}
                      <button
                        onClick={() => toggleActivo(producto)}
                        title={producto.activo ? 'Desactivar' : 'Activar'}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base transition-colors ${
                          producto.activo
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {producto.activo ? '✓' : '○'}
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => abrirEditar(producto)}
                        className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-sm transition-colors"
                      >
                        ✏️
                      </button>

                      {/* Eliminar */}
                      <button
                        onClick={() => eliminarProducto(producto.id)}
                        className="w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center text-sm transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB PEDIDOS */}
        {tab === 'pedidos' && (
          <>
            <p className="text-sm text-gray-500 mb-4">Últimos 50 pedidos</p>
            {pedidos.length === 0 && (
              <p className="text-center text-gray-400 py-16">No hay pedidos todavía</p>
            )}
            <div className="flex flex-col gap-3">
              {pedidos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-white rounded-xl border border-gray-100 p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs text-gray-400">
                      {new Date(pedido.created_at).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm font-bold text-green-600">
                      ${pedido.total.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {pedido.items.map((item, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        {item.cantidad}× {item.nombre}
                        <span className="text-gray-400 text-xs ml-1">
                          (${(item.precio * item.cantidad).toLocaleString('es-AR')})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal formulario */}
      {modalAbierto && (
        <FormularioProducto
          producto={productoEditando}
          onGuardar={guardarProducto}
          onCerrar={cerrarModal}
        />
      )}
    </main>
  )
}
