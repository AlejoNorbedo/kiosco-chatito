'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Pedido } from '@/types'

export default function Dashboard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const hasta = new Date()
    const desde = new Date()
    desde.setDate(desde.getDate() - 30)
    fetch(
      `/api/admin/pedidos?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}&estado=confirmado`
    )
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPedidos(data) })
      .finally(() => setCargando(false))
  }, [])

  const ahora = new Date()
  const hoyStr = ahora.toLocaleDateString('sv-SE')

  const stats = useMemo(() => {
    const diaStr = (p: Pedido) => new Date(p.created_at).toLocaleDateString('sv-SE')

    const hoy = pedidos.filter((p) => diaStr(p) === hoyStr)

    const hace7dias = new Date(ahora)
    hace7dias.setDate(hace7dias.getDate() - 7)
    hace7dias.setHours(0, 0, 0, 0)
    const semana = pedidos.filter((p) => new Date(p.created_at) >= hace7dias)

    const conteo = new Map<string, { nombre: string; cantidad: number }>()
    for (const p of pedidos) {
      for (const item of p.items) {
        const prev = conteo.get(item.nombre) ?? { nombre: item.nombre, cantidad: 0 }
        conteo.set(item.nombre, { ...prev, cantidad: prev.cantidad + item.cantidad })
      }
    }
    const topProductos = Array.from(conteo.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    const diasSemana = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ahora)
      d.setDate(d.getDate() - (6 - i))
      d.setHours(0, 0, 0, 0)
      const dStr = d.toLocaleDateString('sv-SE')
      const del_dia = pedidos.filter((p) => diaStr(p) === dStr)
      const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      return {
        label: i === 6 ? 'Hoy' : labels[d.getDay()],
        cantidad: del_dia.length,
        total: del_dia.reduce((a, p) => a + p.total, 0),
      }
    })

    return {
      hoy: { cantidad: hoy.length, total: hoy.reduce((a, p) => a + p.total, 0) },
      semana: { cantidad: semana.length, total: semana.reduce((a, p) => a + p.total, 0) },
      mes: { cantidad: pedidos.length, total: pedidos.reduce((a, p) => a + p.total, 0) },
      topProductos,
      diasSemana,
    }
  }, [pedidos, hoyStr])

  if (cargando) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100" />
        ))}
      </div>
    )
  }

  const maxTotal = Math.max(...stats.diasSemana.map((d) => d.total), 1)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
        Solo pedidos confirmados · últimos 30 días
      </p>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Hoy', ...stats.hoy },
          { label: '7 días', ...stats.semana },
          { label: '30 días', ...stats.mes },
        ].map(({ label, cantidad, total }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">{cantidad}</p>
            <p className="text-xs font-semibold text-[#CC0000] tabular-nums mt-0.5">
              ${total.toLocaleString('es-AR')}
            </p>
          </div>
        ))}
      </div>

      {/* Gráfica últimos 7 días */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-4">Ventas últimos 7 días</p>
        <div className="flex items-end justify-between gap-1" style={{ height: 108 }}>
          {stats.diasSemana.map((dia) => {
            const altura = dia.total > 0 ? Math.max(Math.round((dia.total / maxTotal) * 80), 4) : 0
            const esHoy = dia.label === 'Hoy'
            return (
              <div key={dia.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-gray-400 tabular-nums h-3 leading-3">
                  {dia.total > 0 ? `$${(dia.total / 1000).toFixed(0)}k` : ''}
                </span>
                <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                  <div
                    className={`w-full rounded-t-md ${esHoy ? 'bg-[#CC0000]' : 'bg-red-200'}`}
                    style={{ height: `${altura}px` }}
                  />
                </div>
                <span className={`text-[10px] font-semibold ${esHoy ? 'text-[#CC0000]' : 'text-gray-500'}`}>
                  {dia.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top productos */}
      {stats.topProductos.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Productos más vendidos</p>
          <div className="flex flex-col gap-3">
            {stats.topProductos.map((prod, i) => {
              const maxCant = stats.topProductos[0].cantidad
              return (
                <div key={prod.nombre} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-4 flex-shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{prod.nombre}</p>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#CC0000] rounded-full transition-all"
                        style={{ width: `${(prod.cantidad / maxCant) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-600 flex-shrink-0 tabular-nums">
                    {prod.cantidad} u.
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-gray-400 text-sm">No hay pedidos confirmados en los últimos 30 días</p>
        </div>
      )}
    </div>
  )
}
