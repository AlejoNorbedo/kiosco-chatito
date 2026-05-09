'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CierreCaja from '@/components/admin/CierreCaja'
import type { Pedido, EstadoPedido } from '@/types'

type Tab = 'pedidos' | 'cierre'

const ESTADO_ESTILOS: Record<EstadoPedido, {
  label: string
  badge: string
  borde: string
  botonActivo: string
}> = {
  pendiente:  { label: 'Pendiente',  badge: 'bg-yellow-100 text-yellow-700', borde: 'border-yellow-200', botonActivo: 'bg-yellow-100 text-yellow-700' },
  confirmado: { label: 'Confirmado', badge: 'bg-green-100 text-green-700',   borde: 'border-green-200',  botonActivo: 'bg-green-100 text-green-700'   },
  cancelado:  { label: 'Cancelado',  badge: 'bg-red-100 text-red-600',       borde: 'border-red-200',    botonActivo: 'bg-red-100 text-red-600'        },
}

export default function PanelEmpleada() {
  const [tab, setTab] = useState<Tab>('pedidos')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | 'todos'>('todos')
  const router = useRouter()

  useEffect(() => {
    cargarPedidos()
  }, [])

  async function cargarPedidos() {
    setCargando(true)
    const res = await fetch('/api/admin/pedidos')
    if (res.ok) setPedidos(await res.json())
    setCargando(false)
  }

  async function cambiarEstado(pedidoId: string, estado: EstadoPedido) {
    const res = await fetch(`/api/admin/pedidos/${pedidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    if (res.ok) {
      const actualizado = await res.json()
      setPedidos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)))
    }
  }

  async function cerrarSesion() {
    await fetch('/api/empleada/auth', { method: 'DELETE' })
    router.push('/empleada/login')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-[#CC0000] sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Panel Empleadas</h1>
          <button
            onClick={cerrarSesion}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-0">
          {(['pedidos', 'cierre'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-white text-white'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {t === 'pedidos' ? 'Pedidos' : 'Cierre de Caja'}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {tab === 'pedidos' && (
          <>
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {([
                { valor: 'todos', label: 'Todos' },
                { valor: 'pendiente', label: 'Pendientes' },
                { valor: 'confirmado', label: 'Confirmados' },
                { valor: 'cancelado', label: 'Cancelados' },
              ] as { valor: EstadoPedido | 'todos'; label: string }[]).map(({ valor, label }) => (
                <button
                  key={valor}
                  onClick={() => setFiltroEstado(valor)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filtroEstado === valor
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                  {valor !== 'todos' && (
                    <span className="ml-1 opacity-70">
                      ({pedidos.filter((p) => (p.estado ?? 'pendiente') === valor).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {cargando ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl h-32 animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : (() => {
              const lista =
                filtroEstado === 'todos'
                  ? pedidos
                  : pedidos.filter((p) => (p.estado ?? 'pendiente') === filtroEstado)
              return lista.length === 0 ? (
                <p className="text-center text-gray-400 py-16">
                  {pedidos.length === 0 ? 'No hay pedidos todavía' : 'No hay pedidos con este estado'}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {lista.map((pedido) => {
                    const dc = pedido.datos_cliente
                    const estado = pedido.estado ?? 'pendiente'
                    const subtotal = pedido.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
                    const costoEnvio = dc?.tipoEntrega === 'envio' ? Math.max(0, pedido.total - subtotal) : 0
                    return (
                      <div key={pedido.id} className={`bg-white rounded-xl border p-4 ${ESTADO_ESTILOS[estado].borde}`}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-gray-500">
                            {new Date(pedido.created_at).toLocaleDateString('es-AR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                            {' — '}
                            {new Date(pedido.created_at).toLocaleTimeString('es-AR', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                            {' hs'}
                          </p>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ESTADO_ESTILOS[estado].badge}`}>
                            {ESTADO_ESTILOS[estado].label}
                          </span>
                        </div>

                        {dc && (
                          <div className="mb-3 flex flex-col gap-1">
                            <p className="text-sm font-semibold text-gray-800">{dc.nombre}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                              {dc.tipoEntrega === 'envio' ? (
                                <span>Envío — {dc.direccion}{dc.entreCalles ? ` (entre ${dc.entreCalles})` : ''}</span>
                              ) : (
                                <span>Retiro en local</span>
                              )}
                              <span>·</span>
                              {dc.metodoPago === 'efectivo' ? (
                                <span>Efectivo{dc.conCuanto ? ` (abona $${parseFloat(dc.conCuanto).toLocaleString('es-AR')})` : ''}</span>
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

                        <ul className="flex flex-col gap-0.5 border-t border-gray-50 pt-2.5 mb-3">
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
                              <span className="tabular-nums">${costoEnvio.toLocaleString('es-AR')}</span>
                            </li>
                          )}
                          <li className="text-sm font-bold text-gray-800 flex justify-between border-t border-gray-100 mt-1 pt-1">
                            <span>Total</span>
                            <span className="text-[#CC0000] tabular-nums">${pedido.total.toLocaleString('es-AR')}</span>
                          </li>
                        </ul>

                        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-semibold">
                          {(['pendiente', 'confirmado', 'cancelado'] as EstadoPedido[]).map((e) => (
                            <button
                              key={e}
                              onClick={() => cambiarEstado(pedido.id, e)}
                              disabled={estado === e}
                              className={`flex-1 py-2 transition-colors ${
                                estado === e
                                  ? ESTADO_ESTILOS[e].botonActivo
                                  : 'bg-white text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {ESTADO_ESTILOS[e].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </>
        )}

        {tab === 'cierre' && <CierreCaja />}
      </div>
    </main>
  )
}
