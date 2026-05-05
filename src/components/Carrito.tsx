'use client'

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
    const lineas = items.map(
      (i) =>
        `• ${i.cantidad}x ${i.producto.nombre} - $${(i.producto.precio * i.cantidad).toLocaleString('es-AR')}`
    )
    const total = `\n*Total: $${totalPrecio.toLocaleString('es-AR')}*`
    return encodeURIComponent(
      `Hola! Quiero hacer este pedido:\n\n${lineas.join('\n')}${total}`
    )
  }

  function pedirPorWhatsApp() {
    if (items.length === 0) return
    const mensaje = armarMensajeWhatsApp()
    window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, '_blank')
  }

  return (
    // Overlay oscuro
    <div
      className="fixed inset-0 bg-black/50 z-40 flex justify-end"
      onClick={onCerrar}
    >
      {/* Panel del carrito */}
      <div
        className="bg-white w-full max-w-sm h-full flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Tu pedido</h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 mt-10">
              Tu carrito está vacío
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.producto.id}
                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.producto.nombre}
                  </p>
                  <p className="text-xs text-gray-500">
                    ${item.producto.precio.toLocaleString('es-AR')} c/u
                  </p>
                </div>

                {/* Control cantidad */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onQuitar(item.producto.id)}
                    className="w-7 h-7 flex items-center justify-center bg-white rounded-lg border text-gray-600 font-bold active:scale-95 transition-transform"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-bold text-sm">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => onAgregar(item.producto)}
                    className="w-7 h-7 flex items-center justify-center bg-green-500 rounded-lg text-white font-bold active:scale-95 transition-transform"
                  >
                    +
                  </button>
                </div>

                <p className="text-sm font-bold text-green-600 w-16 text-right">
                  ${(item.producto.precio * item.cantidad).toLocaleString('es-AR')}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Pie con total y botón */}
        {items.length > 0 && (
          <div className="border-t p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Total</span>
              <span className="text-xl font-bold text-gray-800">
                ${totalPrecio.toLocaleString('es-AR')}
              </span>
            </div>

            <button
              onClick={pedirPorWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da851] text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Pedir por WhatsApp
            </button>

            <button
              onClick={onVaciar}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors text-center"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
