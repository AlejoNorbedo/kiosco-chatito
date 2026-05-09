'use client'

import { useState, useEffect } from 'react'
import type { Cliente } from '@/types'

type ConfigFidelizacion = {
  puntos_para_canje: number
  mensaje_canje: string
}

export default function TabClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [config, setConfig] = useState<ConfigFidelizacion>({ puntos_para_canje: 0, mensaje_canje: '' })
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [canjeando, setCanjeando] = useState<string | null>(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    setErrorMsg('')
    try {
      const [resClientes, resConfig] = await Promise.all([
        fetch('/api/admin/clientes'),
        fetch('/api/admin/configuracion'),
      ])

      const clientesData = await resClientes.json()
      const configData = await resConfig.json()

      console.log('[TabClientes] clientes raw:', clientesData)
      console.log('[TabClientes] config raw:', configData)
      console.log('[TabClientes] status clientes:', resClientes.status)

      if (!resClientes.ok) {
        setErrorMsg(`Error al cargar clientes (${resClientes.status}): ${clientesData?.error ?? 'Error desconocido'}`)
        setCargando(false)
        return
      }

      if (Array.isArray(clientesData)) {
        setClientes(clientesData)
      } else {
        setErrorMsg(`Respuesta inesperada: ${JSON.stringify(clientesData)}`)
      }

      setConfig({
        puntos_para_canje: configData?.puntos_para_canje ?? 0,
        mensaje_canje: configData?.mensaje_canje ?? '',
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de red'
      console.error('[TabClientes] error:', msg)
      setErrorMsg(msg)
    }
    setCargando(false)
  }

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return true
    return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)
  })

  async function canjear(cliente: Cliente) {
    const disponibles = cliente.puntos_acumulados - cliente.puntos_canjeados
    if (disponibles < config.puntos_para_canje) return

    const descripcion = config.mensaje_canje || 'el premio'
    if (!confirm(`¿Canjear ${config.puntos_para_canje} puntos de ${cliente.nombre} por ${descripcion}?`)) return

    setCanjeando(cliente.id)
    const res = await fetch(`/api/admin/clientes/${cliente.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puntos_canjeados: cliente.puntos_canjeados + config.puntos_para_canje }),
    })
    if (res.ok) {
      const actualizado = await res.json()
      setClientes((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)))
    }
    setCanjeando(null)
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-20 animate-pulse border border-gray-100" />
        ))}
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-red-700 mb-1">Error cargando clientes</p>
        <p className="text-xs text-red-600 font-mono break-all">{errorMsg}</p>
        <button
          onClick={cargar}
          className="mt-3 text-xs font-semibold text-red-700 underline"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {config.puntos_para_canje > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
          <strong>{config.puntos_para_canje} puntos</strong> = {config.mensaje_canje || 'premio'}
        </div>
      )}

      <input
        type="text"
        placeholder="Buscar por nombre o teléfono..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000] bg-white"
      />

      <p className="text-xs text-gray-400">{filtrados.length} clientes</p>

      {filtrados.length === 0 ? (
        <p className="text-center text-gray-400 py-16">
          {clientes.length === 0 ? 'No hay clientes todavía' : 'Sin resultados para esa búsqueda'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((cliente) => {
            const disponibles = cliente.puntos_acumulados - cliente.puntos_canjeados
            const puedeCanjar =
              config.puntos_para_canje > 0 && disponibles >= config.puntos_para_canje
            return (
              <div key={cliente.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{cliente.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cliente.telefono}</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-sm font-bold text-[#CC0000]">
                        {disponibles} pts disponibles
                      </span>
                      <span className="text-xs text-gray-400 self-center">
                        {cliente.puntos_acumulados} acumulados · {cliente.puntos_canjeados} canjeados
                      </span>
                    </div>
                  </div>
                  {puedeCanjar && (
                    <button
                      onClick={() => canjear(cliente)}
                      disabled={canjeando === cliente.id}
                      className="flex-shrink-0 bg-[#CC0000] hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                    >
                      {canjeando === cliente.id ? '...' : 'Canjear'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
