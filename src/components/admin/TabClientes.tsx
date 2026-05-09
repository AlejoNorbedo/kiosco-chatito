'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Cliente, HistorialPunto } from '@/types'

type ConfigFidelizacion = {
  puntos_para_canje: number
  mensaje_canje: string
}

type FormEditar = {
  nombre: string
  telefono: string
  ajuste_puntos: string
  concepto: string
}

export default function TabClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [config, setConfig] = useState<ConfigFidelizacion>({ puntos_para_canje: 0, mensaje_canje: '' })
  const [busqueda, setBusqueda] = useState('')
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [errorGuardando, setErrorGuardando] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [canjeando, setCanjeando] = useState<string | null>(null)
  const [historialAbierto, setHistorialAbierto] = useState<string | null>(null)
  const [historialData, setHistorialData] = useState<Record<string, HistorialPunto[]>>({})
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const cargar = useCallback(async () => {
    setErrorMsg('')
    try {
      const [resClientes, resConfig] = await Promise.all([
        fetch('/api/admin/clientes', { cache: 'no-store' }),
        fetch('/api/admin/configuracion', { cache: 'no-store' }),
      ])
      const clientesData = await resClientes.json()
      const configData = await resConfig.json()

      if (!resClientes.ok) {
        setErrorMsg(`Error (${resClientes.status}): ${clientesData?.error ?? 'Error desconocido'}`)
        return
      }
      if (Array.isArray(clientesData)) setClientes(clientesData)
      else setErrorMsg(`Respuesta inesperada: ${JSON.stringify(clientesData)}`)

      setConfig({
        puntos_para_canje: configData?.puntos_para_canje ?? 0,
        mensaje_canje: configData?.mensaje_canje ?? '',
      })
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error de red')
    }
  }, [])

  useEffect(() => {
    setCargandoInicial(true)
    cargar().finally(() => setCargandoInicial(false))
  }, [cargar])

  async function abrirHistorial(clienteId: string) {
    if (historialAbierto === clienteId) {
      setHistorialAbierto(null)
      return
    }
    setHistorialAbierto(clienteId)
    if (historialData[clienteId]) return
    setCargandoHistorial(true)
    const res = await fetch(`/api/admin/clientes/${clienteId}/historial`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setHistorialData((prev) => ({ ...prev, [clienteId]: data }))
    }
    setCargandoHistorial(false)
  }

  async function guardarEdicion(form: FormEditar) {
    if (!editando) return
    setGuardando(true)
    setErrorGuardando(null)

    const ajuste = parseInt(form.ajuste_puntos) || 0
    const body: Record<string, unknown> = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
    }
    if (ajuste !== 0) {
      body.ajuste_puntos = ajuste
      body.concepto = form.concepto.trim()
    }

    try {
      const res = await fetch(`/api/admin/clientes/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const clienteId = editando.id
        setEditando(null)
        setHistorialData((prev) => { const n = { ...prev }; delete n[clienteId]; return n })
        await cargar()
      } else {
        const json = await res.json().catch(() => ({}))
        setErrorGuardando(json.error ?? `Error ${res.status} al guardar`)
      }
    } catch {
      setErrorGuardando('Error de red. Verificá tu conexión.')
    }
    setGuardando(false)
  }

  async function eliminar(cliente: Cliente) {
    if (!confirm(`¿Eliminar a ${cliente.nombre}? Se borrarán todos sus puntos e historial. Esta acción no se puede deshacer.`)) return
    setEliminando(cliente.id)
    try {
      const res = await fetch(`/api/admin/clientes/${cliente.id}`, { method: 'DELETE' })
      if (res.ok) {
        await cargar()
      } else {
        const json = await res.json().catch(() => ({}))
        alert(`Error eliminando: ${json.error ?? `HTTP ${res.status}`}`)
      }
    } catch (e) {
      alert(`Error de red: ${e instanceof Error ? e.message : String(e)}`)
    }
    setEliminando(null)
  }

  async function canjear(cliente: Cliente) {
    if (!config.puntos_para_canje) return
    const descripcion = config.mensaje_canje || 'el premio'
    if (!confirm(`¿Canjear ${config.puntos_para_canje} puntos de ${cliente.nombre} por ${descripcion}?`)) return

    setCanjeando(cliente.id)
    try {
      const res = await fetch(`/api/admin/clientes/${cliente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puntos_canjeados: cliente.puntos_canjeados + config.puntos_para_canje }),
      })
      if (res.ok) {
        setHistorialData((prev) => { const n = { ...prev }; delete n[cliente.id]; return n })
        await cargar()
      }
    } catch { /* silent */ }
    setCanjeando(null)
  }

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return true
    return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)
  })

  if (cargandoInicial) {
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
          type="button"
          onClick={() => { setCargandoInicial(true); cargar().finally(() => setCargandoInicial(false)) }}
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
          {clientes.length === 0 ? 'No hay clientes todavía' : 'Sin resultados'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((cliente) => {
            const disponibles = cliente.puntos_acumulados - cliente.puntos_canjeados
            const puedeCanjar = config.puntos_para_canje > 0 && disponibles >= config.puntos_para_canje
            const historialVisible = historialAbierto === cliente.id
            const historial = historialData[cliente.id]

            return (
              <div key={cliente.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{cliente.nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cliente.telefono}</p>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-sm font-bold text-[#CC0000]">
                          {disponibles} pts disponibles
                        </span>
                        <span className="text-xs text-gray-400 self-center">
                          {cliente.puntos_acumulados} acum. · {cliente.puntos_canjeados} canjeados
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {puedeCanjar && (
                        <button
                          type="button"
                          onClick={() => canjear(cliente)}
                          disabled={canjeando === cliente.id}
                          className="bg-[#CC0000] hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {canjeando === cliente.id ? '...' : 'Canjear'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setEditando(cliente); setErrorGuardando(null) }}
                        title="Editar cliente"
                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-sm transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirHistorial(cliente.id)}
                        title="Ver historial"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                          historialVisible
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        ↕
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminar(cliente)}
                        disabled={eliminando === cliente.id}
                        title="Eliminar cliente"
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-60 flex items-center justify-center text-sm transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {historialVisible && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Historial de puntos
                    </p>
                    {cargandoHistorial && !historial ? (
                      <p className="text-xs text-gray-400">Cargando...</p>
                    ) : !historial || historial.length === 0 ? (
                      <p className="text-xs text-gray-400">Sin movimientos registrados</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {historial.map((h) => (
                          <div key={h.id} className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-gray-600">{h.concepto}</span>
                              <span className="text-xs text-gray-400 ml-2">
                                {new Date(h.created_at).toLocaleDateString('es-AR', {
                                  day: '2-digit', month: '2-digit', year: '2-digit',
                                })}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-bold tabular-nums flex-shrink-0 ${
                                h.puntos >= 0 ? 'text-green-600' : 'text-red-500'
                              }`}
                            >
                              {h.puntos >= 0 ? '+' : ''}{h.puntos}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editando && (
        <ModalEditar
          cliente={editando}
          onGuardar={guardarEdicion}
          onCerrar={() => { setEditando(null); setErrorGuardando(null) }}
          guardando={guardando}
          error={errorGuardando}
        />
      )}
    </div>
  )
}

function ModalEditar({
  cliente,
  onGuardar,
  onCerrar,
  guardando,
  error,
}: {
  cliente: Cliente
  onGuardar: (form: FormEditar) => void
  onCerrar: () => void
  guardando: boolean
  error: string | null
}) {
  const [form, setForm] = useState<FormEditar>({
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    ajuste_puntos: '',
    concepto: '',
  })

  function set(campo: keyof FormEditar, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  const ajuste = parseInt(form.ajuste_puntos) || 0
  const requiereConcepto = ajuste !== 0 && !form.concepto.trim()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Editar cliente</h3>
          <button
            type="button"
            onClick={onCerrar}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Teléfono
            </label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => set('telefono', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Ajuste de puntos
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Ej: 50 o -50"
              value={form.ajuste_puntos}
              onChange={(e) => set('ajuste_puntos', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000]"
            />
            <p className="text-xs text-gray-400 mt-1">
              Puntos actuales:{' '}
              <strong>{cliente.puntos_acumulados - cliente.puntos_canjeados} disponibles</strong>
              {ajuste !== 0 && (
                <span className={ajuste > 0 ? ' text-green-600' : ' text-red-500'}>
                  {' → '}{Math.max(0, (cliente.puntos_acumulados + ajuste) - cliente.puntos_canjeados)} disponibles
                </span>
              )}
            </p>
          </div>

          {ajuste !== 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Motivo *
              </label>
              <input
                type="text"
                placeholder="Ej: corrección, bonus, penalización"
                value={form.concepto}
                onChange={(e) => set('concepto', e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000] ${
                  requiereConcepto ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { if (!requiereConcepto) onGuardar(form) }}
            disabled={guardando || requiereConcepto}
            className="flex-1 bg-[#CC0000] hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
