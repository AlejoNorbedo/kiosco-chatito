'use client'

import { useState } from 'react'
import type { Configuracion, DatosCheckout } from '@/types'

type Props = {
  config: Configuracion
  totalProductos: number
  onEnviar: (datos: DatosCheckout, totalFinal: number) => void
  onVolver: () => void
}

export default function FormularioCheckout({ config, totalProductos, onEnviar }: Props) {
  const [form, setForm] = useState<DatosCheckout>({
    nombre: '',
    tipoEntrega: 'retiro',
    direccion: '',
    entreCalles: '',
    metodoPago: 'efectivo',
    conCuanto: '',
    telefono: '',
    aclaraciones: '',
  })
  const [errores, setErrores] = useState<Partial<Record<keyof DatosCheckout, string>>>({})

  const costoEnvio = form.tipoEntrega === 'envio' ? config.costo_envio : 0
  const totalFinal = totalProductos + costoEnvio

  function set(campo: keyof DatosCheckout, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }))
  }

  function validar(): boolean {
    const e: Partial<Record<keyof DatosCheckout, string>> = {}
    if (!form.nombre.trim()) e.nombre = 'Ingresá tu nombre y apellido'
    if (form.tipoEntrega === 'envio') {
      if (!form.direccion.trim()) e.direccion = 'Ingresá la dirección'
      if (!form.entreCalles.trim()) e.entreCalles = 'Ingresá las calles de referencia'
    }
    if (config.telefono_requerido && !form.telefono.trim()) e.telefono = 'Ingresá tu número de teléfono'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (validar()) onEnviar(form, totalFinal)
  }

  return (
    <>
      {/* Campos del formulario */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Nombre */}
        <Campo label="Nombre y apellido *" error={errores.nombre}>
          <input
            type="text"
            placeholder="Juan García"
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            className={inputClass(!!errores.nombre)}
          />
        </Campo>

        {/* Tipo de entrega */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            ¿Cómo querés recibir tu pedido? *
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['retiro', 'envio'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => set('tipoEntrega', op)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.tipoEntrega === op
                    ? 'border-[#CC0000] bg-red-50 text-[#CC0000]'
                    : 'border-gray-200 text-gray-500 bg-white'
                }`}
              >
                {op === 'retiro' ? 'Retiro en local' : 'Envío a domicilio'}
              </button>
            ))}
          </div>
        </div>

        {/* Campos de envío */}
        {form.tipoEntrega === 'envio' && (
          <>
            <Campo label="Dirección *" error={errores.direccion}>
              <input
                type="text"
                placeholder="Av. Corrientes 1234, piso 2"
                value={form.direccion}
                onChange={(e) => set('direccion', e.target.value)}
                className={inputClass(!!errores.direccion)}
              />
            </Campo>
            <Campo label="Entre calles *" error={errores.entreCalles}>
              <input
                type="text"
                placeholder="Entre Florida y Maipú"
                value={form.entreCalles}
                onChange={(e) => set('entreCalles', e.target.value)}
                className={inputClass(!!errores.entreCalles)}
              />
            </Campo>
            {config.costo_envio > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Se suma el costo de envío: <strong>${config.costo_envio.toLocaleString('es-AR')}</strong>
              </p>
            )}
          </>
        )}

        {/* Método de pago */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Método de pago *
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['efectivo', 'transferencia'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => set('metodoPago', op)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.metodoPago === op
                    ? 'border-[#CC0000] bg-red-50 text-[#CC0000]'
                    : 'border-gray-200 text-gray-500 bg-white'
                }`}
              >
                {op === 'efectivo' ? 'Efectivo' : 'Transferencia'}
              </button>
            ))}
          </div>
        </div>

        {/* Con cuánto abona (solo efectivo) */}
        {form.metodoPago === 'efectivo' && (
          <Campo label="¿Con cuánto abonás? (opcional)" error={undefined}>
            <input
              type="number"
              inputMode="numeric"
              placeholder={`Ej: ${Math.ceil(totalFinal / 100) * 100}`}
              value={form.conCuanto}
              onChange={(e) => set('conCuanto', e.target.value)}
              className={inputClass(false)}
            />
          </Campo>
        )}

        {/* Teléfono (si está configurado como requerido) */}
        {config.telefono_requerido && (
          <Campo label="Teléfono *" error={errores.telefono}>
            <input
              type="tel"
              inputMode="tel"
              placeholder="11 1234-5678"
              value={form.telefono}
              onChange={(e) => set('telefono', e.target.value)}
              className={inputClass(!!errores.telefono)}
            />
          </Campo>
        )}

        {/* Aclaraciones */}
        <Campo label="Aclaraciones (opcional)" error={undefined}>
          <textarea
            placeholder="Sin azúcar, sin TACC, referencias de entrega..."
            value={form.aclaraciones}
            onChange={(e) => set('aclaraciones', e.target.value)}
            rows={2}
            className={`${inputClass(false)} resize-none`}
          />
        </Campo>
      </div>

      {/* Pie: total + botón */}
      <div className="border-t border-gray-100 p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          {form.tipoEntrega === 'envio' && config.costo_envio > 0 && (
            <>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Productos</span>
                <span>${totalProductos.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Envío</span>
                <span>+${config.costo_envio.toLocaleString('es-AR')}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center px-1">
            <span className="text-gray-500 font-medium">Total</span>
            <span className="text-2xl font-extrabold text-gray-800 tabular-nums">
              ${totalFinal.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {config.tiempo_entrega_activo && config.tiempo_entrega_texto && (
          <p className="text-xs text-center text-gray-400">
            Tiempo estimado: <strong>{config.tiempo_entrega_texto}</strong>
          </p>
        )}

        <button
          onClick={handleSubmit}
          className="w-full bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da851] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Confirmar y enviar por WhatsApp
        </button>
      </div>
    </>
  )
}

function inputClass(error: boolean) {
  return `w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
    error
      ? 'border-red-400 bg-red-50 focus:border-red-500'
      : 'border-gray-200 bg-white focus:border-[#CC0000]'
  }`
}

function Campo({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
