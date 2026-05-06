'use client'

import { supabase } from '@/lib/supabase'
import type { ItemCarrito } from '@/types'

type Props = {
  items: ItemCarrito[]
  totalPrecio: number
  onAgregar: (producto: ItemCarrito['producto']) => void
  onQuitar: (productoId: string) => void
  onVaciar: () => void
  onCerrar: () => void
}

export default function Carrito({
  items,
  totalPrecio,
  onAgregar,
  onQuitar,
  onVaciar,
  onCerrar,
}: Props) {
  const numeroWhatsApp = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO

  function armarMensajeWhatsApp(): string {
    const detalles = items.map(
      (i) =>
        `• ${i.cantidad}x ${i.producto.nombre} — $${(i.producto.precio * i.cantidad).toLocaleString('es-AR')}`
    )

    const partes = [
      '¡Hola! 👋 Quisiera hacer el siguiente pedido:',
      '',
      ...detalles,
      '',
      `💰 *Total: $${totalPrecio.toLocaleString('es-AR')}*`,
      '',
      '¡Muchas gracias! Quedo a la espera de su confirmación 🙏',
    ]

    return encodeURIComponent(partes.join('\n'))
  }

  async function pedirPorWhatsApp() {
    if (items.length === 0) return

    const itemsParaGuardar = items.map((i) => ({
      nombre: i.producto.nombre,
      precio: i.producto.precio,
      cantidad: i.cantidad,
    }))
    supabase.from('pedidos').insert({ items: itemsParaGuardar, total: totalPrecio }).then()

    window.open(`https://wa.me/${numeroWhatsApp}?text=${armarMensajeWhatsApp()}`, '_blank')
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex justify-end"
      onClick={onCerrar}
    >
      <div
        className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800">Tu pedido</h2>
          <button
            onClick={onCerrar}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Lista de items */}
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

                {/* Control cantidad */}
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

        {/* Pie */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-gray-500 font-medium">Total</span>
              <span className="text-2xl font-extrabold text-gray-800 tabular-nums">
                ${totalPrecio.toLocaleString('es-AR')}
              </span>
            </div>

            <button
              onClick={pedirPorWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da851] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Enviar pedido por WhatsApp
            </button>

            <button
              onClick={onVaciar}
              className="text-sm text-gray-400 hover:text-red-400 transition-colors text-center py-1"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
