'use client'

import { useState, useEffect, useCallback } from 'react'

export const CLAVE_TELEFONO = 'kiosco-telefono'
/** El carrito lo dispara al cerrar un pedido para refrescar el saldo. */
export const EVENTO_PUNTOS = 'kiosco-puntos-actualizados'

type Saldo = {
  activo: boolean
  encontrado?: boolean
  puntos: number
  puntos_para_canje: number
  mensaje_canje: string
}

type Props = {
  /** Si la fidelización está apagada en config, el chip no se muestra. */
  fidelizacionActiva: boolean
}

export default function MisPuntos({ fidelizacionActiva }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [telefono, setTelefono] = useState('')
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  const [consultando, setConsultando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const consultar = useCallback(async (numero: string, guardar: boolean) => {
    const digitos = numero.replace(/\D/g, '')
    if (digitos.length < 6) {
      setError('Ingresá tu número completo, sin el 0 ni el 15')
      return
    }

    setConsultando(true)
    setError(null)
    try {
      const res = await fetch(`/api/puntos?telefono=${encodeURIComponent(digitos)}`)
      const datos = await res.json()
      if (!res.ok) throw new Error(datos?.error ?? 'No pudimos consultar tus puntos')

      setSaldo(datos)
      if (guardar && datos.encontrado) {
        try {
          localStorage.setItem(CLAVE_TELEFONO, numero)
        } catch {
          // Modo incógnito o storage lleno: se consulta igual, no se recuerda.
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos consultar tus puntos')
    } finally {
      setConsultando(false)
    }
  }, [])

  // Al abrir la app: si el celular ya recuerda el teléfono, trae el saldo solo.
  useEffect(() => {
    if (!fidelizacionActiva) return

    function refrescar() {
      let guardado: string | null = null
      try {
        guardado = localStorage.getItem(CLAVE_TELEFONO)
      } catch {
        return
      }
      if (!guardado) return
      setTelefono(guardado)
      consultar(guardado, false)
    }

    refrescar()
    window.addEventListener(EVENTO_PUNTOS, refrescar)
    return () => window.removeEventListener(EVENTO_PUNTOS, refrescar)
  }, [fidelizacionActiva, consultar])

  function olvidar() {
    try {
      localStorage.removeItem(CLAVE_TELEFONO)
    } catch {
      // No pasa nada: igual se limpia lo que está en pantalla.
    }
    setTelefono('')
    setSaldo(null)
    setError(null)
  }

  if (!fidelizacionActiva) return null

  const tieneSaldo = saldo?.encontrado === true
  const faltan = saldo ? Math.max(0, saldo.puntos_para_canje - saldo.puntos) : 0
  const puedeCanjear = !!saldo && saldo.puntos_para_canje > 0 && saldo.puntos >= saldo.puntos_para_canje
  const progreso =
    saldo && saldo.puntos_para_canje > 0
      ? Math.min(100, Math.round((saldo.puntos / saldo.puntos_para_canje) * 100))
      : 0

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        aria-label="Ver mis puntos"
        className="h-9 px-2.5 flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-colors"
      >
        <span className="text-base leading-none">★</span>
        {tieneSaldo ? (
          <span className="tabular-nums">{saldo!.puntos}</span>
        ) : (
          <span className="hidden sm:inline text-xs font-semibold">Mis puntos</span>
        )}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-6 pt-6 pb-4 text-center">
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xl leading-none transition-colors"
              >
                ×
              </button>
              <p className="text-3xl">★</p>
              <h2 className="text-xl font-extrabold text-[#CC0000] mt-1">Mis puntos</h2>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-4">
              {tieneSaldo ? (
                <>
                  <div className="text-center">
                    <p className="text-5xl font-extrabold text-gray-800 tabular-nums leading-none">
                      {saldo!.puntos}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {saldo!.puntos === 1 ? 'punto disponible' : 'puntos disponibles'}
                    </p>
                  </div>

                  {saldo!.puntos_para_canje > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            puedeCanjear ? 'bg-green-500' : 'bg-[#CC0000]'
                          }`}
                          style={{ width: `${progreso}%` }}
                        />
                      </div>

                      {puedeCanjear ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                          <p className="text-sm font-bold text-green-800">
                            ¡Ya podés canjear tu premio!
                          </p>
                          {saldo!.mensaje_canje && (
                            <p className="text-xs text-green-700 mt-0.5">{saldo!.mensaje_canje}</p>
                          )}
                          <p className="text-xs text-green-600 mt-1.5">
                            Pedilo en el kiosco al hacer tu próxima compra.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-center text-gray-500">
                          Te faltan <strong className="text-gray-800">{faltan}</strong>{' '}
                          {faltan === 1 ? 'punto' : 'puntos'}
                          {saldo!.mensaje_canje ? ` para ${saldo!.mensaje_canje}` : ' para tu premio'}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={olvidar}
                    className="text-xs text-gray-400 hover:text-[#CC0000] transition-colors py-1"
                  >
                    Usar otro número
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 text-center leading-snug">
                    Ingresá el teléfono con el que hacés tus pedidos y te mostramos cuántos puntos
                    acumulaste.
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="11 1234-5678"
                      value={telefono}
                      onChange={(e) => {
                        setTelefono(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') consultar(telefono, true)
                      }}
                      className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000] transition-colors"
                    />
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    {saldo?.encontrado === false && !error && (
                      <p className="text-xs text-amber-600">
                        Todavía no encontramos puntos con ese número. Se acumulan cuando hacés un
                        pedido dejando tu teléfono.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => consultar(telefono, true)}
                    disabled={consultando}
                    className="w-full bg-[#CC0000] hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    {consultando ? 'Consultando…' : 'Ver mis puntos'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
