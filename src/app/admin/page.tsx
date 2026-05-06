'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FormularioProducto from '@/components/admin/FormularioProducto'
import CierreCaja from '@/components/admin/CierreCaja'
import type { Producto, Pedido, Configuracion } from '@/types'

type Tab = 'productos' | 'pedidos' | 'cierre' | 'configuracion'

const TAB_LABELS: Record<Tab, string> = {
  productos: 'Productos',
  pedidos: 'Pedidos',
  cierre: 'Cierre de Caja',
  configuracion: 'Configuración',
}

export default function PaginaAdmin() {
  const [tab, setTab] = useState<Tab>('productos')
  const [productos, setProductos] = useState<Producto[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [config, setConfig] = useState<Configuracion>({
    costo_envio: 0,
    tiempo_entrega_activo: false,
    tiempo_entrega_texto: '30-45 minutos',
    telefono_requerido: false,
    monto_minimo: 0,
  })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditando, setProductoEditando] = useState<Producto | undefined>()
  const [guardandoConfig, setGuardandoConfig] = useState(false)
  const [mensajeConfig, setMensajeConfig] = useState('')
  const router = useRouter()

  useEffect(() => {
    cargarProductos()
  }, [])

  useEffect(() => {
    if (tab === 'pedidos' && pedidos.length === 0) cargarPedidos()
    if (tab === 'configuracion') cargarConfig()
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

  async function cargarConfig() {
    const res = await fetch('/api/admin/configuracion')
    if (res.ok) setConfig(await res.json())
  }

  async function guardarConfig() {
    setGuardandoConfig(true)
    setMensajeConfig('')
    const res = await fetch('/api/admin/configuracion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    setGuardandoConfig(false)
    setMensajeConfig(res.ok ? '✓ Guardado' : 'Error al guardar')
    setTimeout(() => setMensajeConfig(''), 3000)
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
      <header className="bg-[#CC0000] sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Panel Admin</h1>
          <button
            onClick={cerrarSesion}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto scrollbar-hide">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-white text-white'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {TAB_LABELS[t]}
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
                className="bg-[#CC0000] hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
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

                    <div className="flex items-center gap-2 flex-shrink-0">
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

                      <button
                        onClick={() => abrirEditar(producto)}
                        className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-sm transition-colors"
                      >
                        ✏️
                      </button>

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
              {pedidos.map((pedido) => {
                const dc = pedido.datos_cliente
                return (
                  <div key={pedido.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    {/* Encabezado: fecha */}
                    <p className="text-xs font-semibold text-gray-500 mb-3">
                      {new Date(pedido.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                      {' — '}
                      {new Date(pedido.created_at).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' hs'}
                    </p>

                    {/* Datos del cliente */}
                    {dc && (
                      <div className="mb-3 flex flex-col gap-1">
                        <p className="text-sm font-semibold text-gray-800">{dc.nombre}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                          {dc.tipoEntrega === 'envio' ? (
                            <span>
                              Envío — {dc.direccion}
                              {dc.entreCalles ? ` (entre ${dc.entreCalles})` : ''}
                            </span>
                          ) : (
                            <span>Retiro en local</span>
                          )}
                          <span>·</span>
                          {dc.metodoPago === 'efectivo' ? (
                            <span>
                              Efectivo
                              {dc.conCuanto ? ` (abona $${parseFloat(dc.conCuanto).toLocaleString('es-AR')})` : ''}
                            </span>
                          ) : (
                            <span>Transferencia</span>
                          )}
                          {dc.telefono && <><span>·</span><span>{dc.telefono}</span></>}
                        </div>
                        {dc.aclaraciones && (
                          <p className="text-xs text-gray-400 italic">{dc.aclaraciones}</p>
                        )}
                      </div>
                    )}

                    {/* Items + desglose */}
                    {(() => {
                      const subtotal = pedido.items.reduce(
                        (acc, i) => acc + i.precio * i.cantidad,
                        0
                      )
                      const costoEnvio =
                        dc?.tipoEntrega === 'envio'
                          ? Math.max(0, pedido.total - subtotal)
                          : 0
                      return (
                        <ul className="flex flex-col gap-0.5 border-t border-gray-50 pt-2.5">
                          {pedido.items.map((item, i) => (
                            <li key={i} className="text-sm text-gray-700 flex justify-between">
                              <span>{item.cantidad}× {item.nombre}</span>
                              <span className="text-gray-400 text-xs tabular-nums">
                                ${(item.precio * item.cantidad).toLocaleString('es-AR')}
                              </span>
                            </li>
                          ))}
                          {costoEnvio > 0 && (
                            <li className="text-xs text-gray-400 flex justify-between border-t border-dashed border-gray-100 mt-1 pt-1">
                              <span>Costo de envío</span>
                              <span className="tabular-nums">
                                ${costoEnvio.toLocaleString('es-AR')}
                              </span>
                            </li>
                          )}
                          <li className="text-sm font-bold text-gray-800 flex justify-between border-t border-gray-100 mt-1 pt-1">
                            <span>Total</span>
                            <span className="text-[#CC0000] tabular-nums">
                              ${pedido.total.toLocaleString('es-AR')}
                            </span>
                          </li>
                        </ul>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* TAB CONFIGURACIÓN */}
        {tab === 'configuracion' && (
          <div className="flex flex-col gap-4">
            {/* Monto mínimo */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Pedido mínimo</p>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Monto mínimo de pedido ($)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={config.monto_minimo}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, monto_minimo: parseInt(e.target.value) || 0 }))
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Ponelo en 0 para no exigir un mínimo.
              </p>
            </div>

            {/* Costo de envío */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Envío a domicilio</p>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Costo de envío ($)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={config.costo_envio}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, costo_envio: parseInt(e.target.value) || 0 }))
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Ponelo en 0 si el envío es gratis o si no ofrecés envío.
              </p>
            </div>

            {/* Tiempo estimado */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Tiempo estimado de entrega</p>
                <Toggle
                  activo={config.tiempo_entrega_activo}
                  onChange={(v) => setConfig((prev) => ({ ...prev, tiempo_entrega_activo: v }))}
                />
              </div>
              {config.tiempo_entrega_activo && (
                <input
                  type="text"
                  value={config.tiempo_entrega_texto}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, tiempo_entrega_texto: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
                  placeholder="Ej: 30-45 minutos"
                />
              )}
              <p className="text-xs text-gray-400 mt-1.5">
                Se muestra en el formulario de pedido y en el mensaje de WhatsApp.
              </p>
            </div>

            {/* Teléfono requerido */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-semibold text-gray-700">Solicitar teléfono al cliente</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    El cliente deberá ingresar su número antes de enviar el pedido.
                  </p>
                </div>
                <Toggle
                  activo={config.telefono_requerido}
                  onChange={(v) => setConfig((prev) => ({ ...prev, telefono_requerido: v }))}
                />
              </div>
            </div>

            {/* Guardar */}
            <div className="flex items-center gap-3">
              <button
                onClick={guardarConfig}
                disabled={guardandoConfig}
                className="bg-[#CC0000] hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
              >
                {guardandoConfig ? 'Guardando...' : 'Guardar cambios'}
              </button>
              {mensajeConfig && (
                <span
                  className={`text-sm font-medium ${
                    mensajeConfig.startsWith('✓') ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {mensajeConfig}
                </span>
              )}
            </div>
          </div>
        )}

        {/* TAB CIERRE DE CAJA */}
        {tab === 'cierre' && <CierreCaja />}
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

function Toggle({ activo, onChange }: { activo: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!activo)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        activo ? 'bg-green-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          activo ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
