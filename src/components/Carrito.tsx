'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import FormularioCheckout from '@/components/FormularioCheckout'
import type { ItemCarrito, Configuracion, DatosCheckout } from '@/types'

type Props = {
  items: ItemCarrito[]
  totalPrecio: number
  onAgregar: (producto: ItemCarrito['producto']) => void
  onQuitar: (productoId: string) => void
  onVaciar: () => void
  onCerrar: () => void
}

const CONFIG_DEFECTO: Configuracion = {
  costo_envio: 0,
  tiempo_entrega_activo: false,
  tiempo_entrega_texto: '30-45 minutos',
  telefono_requerido: false,
  monto_minimo: 0,
  puntos_por_monto: 0,
  puntos_para_canje: 0,
  mensaje_canje: '',
}

export default function Carrito({
  items,
  totalPrecio,
  onAgregar,
  onQuitar,
  onVaciar,
  onCerrar,
}: Props) {
  const [paso, setPaso] = useState<'carrito' | 'checkout'>('carrito')
  const [config, setConfig] = useState<Configuracion>(CONFIG_DEFECTO)

  const numeroWhatsApp = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO

  useEffect(() => {
    supabase
      .from('configuracion')
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) setConfig((prev) => ({ ...prev, ...data }))
      })
  }, [])

  function armarMensajeWhatsApp(datos: DatosCheckout, totalFinal: number): string {
    const costoEnvio = datos.tipoEntrega === 'envio' ? config.costo_envio : 0

    const detalles = items.map(
      (i) =>
        `  ${i.cantidad}x ${i.producto.nombre} — $${(i.producto.precio * i.cantidad).toLocaleString('es-AR')}`
    )

    const partes: string[] = [
      'Hola, quisiera hacer el siguiente pedido:',
      '',
      '*--- PEDIDO ---*',
      ...detalles,
      '',
      '*--- DATOS DEL CLIENTE ---*',
      `*Nombre:* ${datos.nombre}`,
    ]

    if (datos.telefono.trim()) {
      partes.push(`*Telefono:* ${datos.telefono.trim()}`)
    }

    partes.push('')
    partes.push('*--- ENTREGA ---*')
    if (datos.tipoEntrega === 'envio') {
      partes.push('*Modalidad:* Envio a domicilio')
      partes.push(`*Direccion:* ${datos.direccion}`)
      partes.push(`*Entre calles:* ${datos.entreCalles}`)
    } else {
      partes.push('*Modalidad:* Retiro en local')
    }

    partes.push('')
    partes.push('*--- PAGO ---*')
    if (datos.metodoPago === 'efectivo') {
      const num = parseFloat(datos.conCuanto)
      const abona =
        datos.conCuanto && !isNaN(num)
          ? ` (abona con $${num.toLocaleString('es-AR')})`
          : ''
      partes.push(`*Metodo:* Efectivo${abona}`)
    } else {
      partes.push('*Metodo:* Transferencia')
    }

    if (datos.aclaraciones.trim()) {
      partes.push(`*Aclaraciones:* ${datos.aclaraciones.trim()}`)
    }

    partes.push('')
    partes.push('*--- TOTAL ---*')
    if (costoEnvio > 0) {
      partes.push(`Subtotal productos: $${totalPrecio.toLocaleString('es-AR')}`)
      partes.push(`Costo de envio: $${costoEnvio.toLocaleString('es-AR')}`)
    }
    partes.push(`*Total: $${totalFinal.toLocaleString('es-AR')}*`)

    if (config.tiempo_entrega_activo && config.tiempo_entrega_texto) {
      partes.push(`Tiempo estimado: ${config.tiempo_entrega_texto}`)
    }

    if (config.puntos_por_monto > 0 && datos.telefono.trim()) {
      const puntosGanados = Math.floor(totalFinal / config.puntos_por_monto)
      partes.push('')
      partes.push('*--- PUNTOS DE FIDELIDAD ---*')
      partes.push(`*Puntos ganados en este pedido:* ${puntosGanados}`)
    }

    partes.push('')
    partes.push('Muchas gracias, quedo a la espera de su confirmacion.')

    return encodeURIComponent(partes.join('\n'))
  }

  function handleEnviar(datos: DatosCheckout, totalFinal: number) {
    const itemsParaGuardar = items.map((i) => ({
      nombre: i.producto.nombre,
      precio: i.producto.precio,
      cantidad: i.cantidad,
    }))
    const puntos_generados =
      config.puntos_por_monto > 0 && datos.telefono.trim()
        ? Math.floor(totalFinal / config.puntos_por_monto)
        : 0
    supabase
      .from('pedidos')
      .insert({ items: itemsParaGuardar, total: totalFinal, datos_cliente: datos, puntos_generados })
      .then()

    if (config.puntos_por_monto > 0 && datos.telefono.trim()) {
      fetch('/api/fidelizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: datos.telefono.trim(),
          nombre: datos.nombre.trim(),
          monto: totalFinal,
        }),
      }).catch(() => {})
    }

    window.open(`https://wa.me/${numeroWhatsApp}?text=${armarMensajeWhatsApp(datos, totalFinal)}`, '_blank')
  }

  function handleCerrar() {
    setPaso('carrito')
    onCerrar()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex justify-end"
      onClick={handleCerrar}
    >
      <div
        className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {paso === 'checkout' ? (
            <>
              <button
                onClick={() => setPaso('carrito')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-lg leading-none transition-colors"
                aria-label="Volver al carrito"
              >
                ←
              </button>
              <h2 className="text-lg font-extrabold text-gray-800">Datos del pedido</h2>
              <button
                onClick={handleCerrar}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xl leading-none transition-colors"
              >
                ×
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-extrabold text-gray-800">Tu pedido</h2>
              <button
                onClick={handleCerrar}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xl leading-none transition-colors"
              >
                ×
              </button>
            </>
          )}
        </div>

        {/* Paso 1: lista de items */}
        {paso === 'carrito' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-3xl mb-2">🛒</p>
                  <p className="text-gray-400 font-medium">Tu carrito está vacío</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.producto.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {item.producto.nombre}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ${item.producto.precio.toLocaleString('es-AR')} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onQuitar(item.producto.id)}
                        className="w-7 h-7 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-600 font-bold active:scale-90 transition-transform"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-extrabold text-sm tabular-nums">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => onAgregar(item.producto)}
                        className="w-7 h-7 flex items-center justify-center bg-[#CC0000] rounded-lg text-white font-bold active:scale-90 transition-transform"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-sm font-extrabold text-[#CC0000] w-16 text-right tabular-nums">
                      ${(item.producto.precio * item.cantidad).toLocaleString('es-AR')}
                    </p>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-gray-100 p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-gray-500 font-medium">Total</span>
                  <span className="text-2xl font-extrabold text-gray-800 tabular-nums">
                    ${totalPrecio.toLocaleString('es-AR')}
                  </span>
                </div>

                {config.monto_minimo > 0 && totalPrecio < config.monto_minimo && (
                  <p className="text-xs text-center text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    Te faltan{' '}
                    <strong>
                      ${(config.monto_minimo - totalPrecio).toLocaleString('es-AR')}
                    </strong>{' '}
                    para el pedido mínimo de ${config.monto_minimo.toLocaleString('es-AR')}
                  </p>
                )}

                <button
                  onClick={() => setPaso('checkout')}
                  disabled={config.monto_minimo > 0 && totalPrecio < config.monto_minimo}
                  className="w-full bg-[#CC0000] hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-900/20 disabled:shadow-none"
                >
                  Continuar con el pedido →
                </button>

                <button
                  onClick={onVaciar}
                  className="text-sm text-gray-400 hover:text-red-400 transition-colors text-center py-1"
                >
                  Vaciar carrito
                </button>
              </div>
            )}
          </>
        )}

        {/* Paso 2: formulario de checkout */}
        {paso === 'checkout' && (
          <FormularioCheckout
            config={config}
            totalProductos={totalPrecio}
            onEnviar={handleEnviar}
            onVolver={() => setPaso('carrito')}
          />
        )}
      </div>
    </div>
  )
}
