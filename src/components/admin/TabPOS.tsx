'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { CONFIG_DEFECTO } from '@/lib/configuracion'
import { precioEfectivo } from '@/lib/productos'
import type { Producto, Configuracion } from '@/types'

/**
 * Punto de venta para cobrar en el mostrador.
 *
 * Los productos se leen con la clave pública (solo trae los activos, que es
 * justo lo que se puede vender) en lugar de por /api/admin/productos: así la
 * pantalla funciona igual para el dueño y para las empleadas, sin ampliarles
 * los permisos.
 */

type LineaTicket = { producto: Producto; cantidad: number }

type Resultado = {
  total: number
  recibido: number
  vuelto: number
  puntos_generados: number
  puntos_acumulados: number
}

export default function TabPOS() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [config, setConfig] = useState<Configuracion>(CONFIG_DEFECTO)
  const [cargando, setCargando] = useState(true)

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [ticket, setTicket] = useState<LineaTicket[]>([])

  const [cobrando, setCobrando] = useState(false)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [recibido, setRecibido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    async function cargar() {
      const [{ data: prods }, { data: cfg }] = await Promise.all([
        supabase.from('productos').select('*').eq('activo', true).order('nombre'),
        supabase.from('configuracion').select('*').single(),
      ])
      setProductos(prods ?? [])
      if (cfg) setConfig((prev) => ({ ...prev, ...cfg }))
      setCargando(false)
    }
    cargar()
  }, [])

  const categorias = useMemo(
    () => ['Todos', ...Array.from(new Set(productos.map((p) => p.categoria))).sort()],
    [productos]
  )

  const visibles = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (term) return productos.filter((p) => p.nombre.toLowerCase().includes(term))
    return categoria === 'Todos' ? productos : productos.filter((p) => p.categoria === categoria)
  }, [productos, busqueda, categoria])

  const subtotal = ticket.reduce((acc, l) => acc + precioEfectivo(l.producto) * l.cantidad, 0)
  const subtotalRecargable = ticket.reduce(
    (acc, l) => (l.producto.recargo_transferencia ? acc + precioEfectivo(l.producto) * l.cantidad : acc),
    0
  )
  const recargoPct = config.recargo_transferencia_pct ?? 0
  const recargo =
    metodoPago === 'transferencia' && recargoPct > 0 && subtotalRecargable > 0
      ? Math.round((subtotalRecargable * recargoPct) / 100)
      : 0
  const total = subtotal + recargo
  const unidades = ticket.reduce((acc, l) => acc + l.cantidad, 0)

  const recibidoNum = parseFloat(recibido)
  const vuelto =
    metodoPago === 'efectivo' && !isNaN(recibidoNum) && recibidoNum > total ? recibidoNum - total : 0

  const fidelizacionActiva = (config.puntos_por_monto ?? 0) > 0

  function agregar(producto: Producto) {
    setTicket((prev) => {
      const existente = prev.find((l) => l.producto.id === producto.id)
      if (existente) {
        return prev.map((l) =>
          l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l
        )
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  function quitar(productoId: string) {
    setTicket((prev) =>
      prev
        .map((l) => (l.producto.id === productoId ? { ...l, cantidad: l.cantidad - 1 } : l))
        .filter((l) => l.cantidad > 0)
    )
  }

  function nuevaVenta() {
    setTicket([])
    setRecibido('')
    setTelefono('')
    setMetodoPago('efectivo')
    setResultado(null)
    setError(null)
    setPanelAbierto(false)
  }

  async function cobrar() {
    if (ticket.length === 0 || cobrando) return
    setCobrando(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: ticket.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
          metodoPago,
          telefono: telefono.trim(),
          recibido: !isNaN(recibidoNum) ? recibidoNum : 0,
        }),
      })

      const datos = await res.json()
      if (!res.ok) throw new Error(datos?.error ?? 'No pudimos registrar la venta')

      setResultado(datos)
      // El stock cambió en la base: se refleja en la grilla sin recargar.
      setProductos((prev) =>
        prev.map((p) => {
          const linea = ticket.find((l) => l.producto.id === p.id)
          return linea ? { ...p, stock: Math.max(0, p.stock - linea.cantidad) } : p
        })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos registrar la venta')
    } finally {
      setCobrando(false)
    }
  }

  if (cargando) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100" />
        ))}
      </div>
    )
  }

  // ─── Venta cobrada ─────────────────────────────────────────────────────────
  if (resultado) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center text-center gap-4">
        <p className="text-4xl">✅</p>
        <div>
          <h3 className="text-xl font-extrabold text-gray-800">Venta registrada</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Total cobrado: ${resultado.total.toLocaleString('es-AR')}
          </p>
        </div>

        {resultado.vuelto > 0 && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Vuelto</p>
            <p className="text-4xl font-extrabold text-amber-800 tabular-nums mt-1">
              ${resultado.vuelto.toLocaleString('es-AR')}
            </p>
          </div>
        )}

        {resultado.puntos_generados > 0 && (
          <p className="text-sm text-gray-500">
            Sumó <strong className="text-gray-800">{resultado.puntos_generados}</strong>{' '}
            {resultado.puntos_generados === 1 ? 'punto' : 'puntos'} · total acumulado:{' '}
            <strong className="text-gray-800">{resultado.puntos_acumulados}</strong>
          </p>
        )}

        <button
          onClick={nuevaVenta}
          className="w-full bg-[#CC0000] hover:bg-red-700 active:bg-red-800 text-white font-bold py-3.5 rounded-2xl transition-colors"
        >
          Nueva venta
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-24">
      {/* Búsqueda */}
      <input
        type="search"
        placeholder="Buscar producto…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000] transition-colors"
      />

      {/* Categorías */}
      {!busqueda.trim() && categorias.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                categoria === cat
                  ? 'bg-[#CC0000] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grilla de productos */}
      {visibles.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">No hay productos para esa búsqueda</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {visibles.map((producto) => {
            const enTicket = ticket.find((l) => l.producto.id === producto.id)
            return (
              <button
                key={producto.id}
                onClick={() => agregar(producto)}
                className={`relative text-left bg-white rounded-xl border p-3 min-h-[84px] flex flex-col justify-between transition-all active:scale-[0.97] ${
                  enTicket ? 'border-[#CC0000] ring-1 ring-[#CC0000]' : 'border-gray-100'
                }`}
              >
                {enTicket && (
                  <span className="absolute top-1.5 right-1.5 bg-[#CC0000] text-white text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center">
                    {enTicket.cantidad}
                  </span>
                )}
                <p className="text-xs font-semibold text-gray-700 leading-snug pr-5 line-clamp-2">
                  {producto.nombre}
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-sm font-extrabold text-[#CC0000] tabular-nums">
                    ${precioEfectivo(producto).toLocaleString('es-AR')}
                  </span>
                  {producto.stock <= 0 && (
                    <span className="text-[10px] text-amber-600 font-semibold">sin stock</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Barra inferior fija con el ticket */}
      {ticket.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setTicket([])}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              Vaciar
            </button>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] text-gray-400 leading-none">
                {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
              </p>
              <p className="text-xl font-extrabold text-gray-800 tabular-nums leading-tight">
                ${total.toLocaleString('es-AR')}
              </p>
            </div>
            <button
              onClick={() => setPanelAbierto(true)}
              className="flex-shrink-0 bg-[#CC0000] hover:bg-red-700 active:bg-red-800 text-white font-bold px-6 py-3 rounded-2xl transition-colors"
            >
              Cobrar
            </button>
          </div>
        </div>
      )}

      {/* Panel de cobro */}
      {panelAbierto && (
        <div
          className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center"
          onClick={() => setPanelAbierto(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-800">Cobrar</h3>
              <button
                onClick={() => setPanelAbierto(false)}
                aria-label="Cerrar"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Items */}
              <div className="flex flex-col gap-2">
                {ticket.map((linea) => (
                  <div
                    key={linea.producto.id}
                    className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5"
                  >
                    <p className="flex-1 min-w-0 text-sm font-semibold text-gray-700 truncate">
                      {linea.producto.nombre}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => quitar(linea.producto.id)}
                        className="w-7 h-7 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-600 font-bold active:scale-90 transition-transform"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-extrabold text-sm tabular-nums">
                        {linea.cantidad}
                      </span>
                      <button
                        onClick={() => agregar(linea.producto)}
                        className="w-7 h-7 flex items-center justify-center bg-[#CC0000] rounded-lg text-white font-bold active:scale-90 transition-transform"
                      >
                        +
                      </button>
                    </div>
                    <p className="w-16 text-right text-sm font-extrabold text-[#CC0000] tabular-nums flex-shrink-0">
                      ${(precioEfectivo(linea.producto) * linea.cantidad).toLocaleString('es-AR')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Método de pago */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Método de pago
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['efectivo', 'transferencia'] as const).map((op) => (
                    <button
                      key={op}
                      onClick={() => setMetodoPago(op)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        metodoPago === op
                          ? 'border-[#CC0000] bg-red-50 text-[#CC0000]'
                          : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      {op === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vuelto */}
              {metodoPago === 'efectivo' && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    ¿Con cuánto paga? (opcional)
                  </p>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={`Ej: ${Math.ceil(total / 1000) * 1000}`}
                    value={recibido}
                    onChange={(e) => setRecibido(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000] transition-colors"
                  />
                  {vuelto > 0 && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex justify-between items-center">
                      <span className="text-sm font-semibold text-amber-800">Vuelto</span>
                      <span className="text-xl font-extrabold text-amber-800 tabular-nums">
                        ${vuelto.toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Fidelización */}
              {fidelizacionActiva && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Teléfono para sumar puntos (opcional)
                  </p>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="11 1234-5678"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000] transition-colors"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Total y confirmación */}
            <div className="border-t border-gray-100 p-4 flex flex-col gap-2">
              {recargo > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Recargo transferencia ({recargoPct}%)</span>
                  <span>+${recargo.toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Total</span>
                <span className="text-2xl font-extrabold text-gray-800 tabular-nums">
                  ${total.toLocaleString('es-AR')}
                </span>
              </div>
              <button
                onClick={cobrar}
                disabled={cobrando}
                className="w-full bg-[#CC0000] hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-2xl transition-colors"
              >
                {cobrando ? 'Registrando…' : 'Confirmar venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
