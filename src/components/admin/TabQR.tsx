'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Cartel con el QR del catálogo, para imprimir y pegar en el mostrador.
 *
 * El QR no instala nada por sí solo: abre el sitio en el navegador del cliente,
 * y ahí aparece el ModalInstalacion con las instrucciones (o el botón de
 * instalación directa en Android).
 */

const TAMANO_QR = 900 // px del PNG generado; se escala por CSS al mostrarlo

export default function TabQR() {
  const [url, setUrl] = useState('')
  const [qr, setQr] = useState('')
  const [generando, setGenerando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const generar = useCallback(async (destino: string) => {
    if (!destino.trim()) return
    setGenerando(true)
    setError(null)
    try {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(destino.trim(), {
        width: TAMANO_QR,
        margin: 1,
        // Alto: tolera que el cartel se manche o se despegue una esquina.
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#FFFFFF' },
      })
      setQr(dataUrl)
    } catch {
      setError('No se pudo generar el código QR')
    } finally {
      setGenerando(false)
    }
  }, [])

  useEffect(() => {
    const inicial = window.location.origin
    setUrl(inicial)
    generar(inicial)
  }, [generar])

  function imprimir() {
    if (!qr) return
    const ventana = window.open('', '_blank', 'width=800,height=1000')
    if (!ventana) {
      setError('El navegador bloqueó la ventana de impresión. Habilitá los pop-ups y reintentá.')
      return
    }

    const visible = url.replace(/^https?:\/\//, '').replace(/\/$/, '')

    ventana.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>QR Kiosco Chatito</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.cartel{width:100%;max-width:520px;text-align:center;border:6px solid #CC0000;border-radius:24px;padding:32px 28px}
.logo{width:96px;height:96px;border-radius:20px;object-fit:cover;margin:0 auto 14px}
h1{font-size:34px;color:#CC0000;letter-spacing:-.5px;line-height:1.1}
.bajada{font-size:19px;color:#333;margin-top:8px;font-weight:600}
.qr{width:300px;height:300px;margin:22px auto;display:block}
.url{font-size:21px;font-weight:800;color:#111;letter-spacing:.3px}
.pie{font-size:14px;color:#666;margin-top:14px;line-height:1.45}
.pie strong{color:#CC0000}
@media print{body{padding:0;min-height:auto}.cartel{border-width:5px}}
</style></head>
<body>
  <div class="cartel">
    <img class="logo" src="${window.location.origin}/logo.png" alt="">
    <h1>Kiosco Chatito</h1>
    <p class="bajada">Escaneá y pedí por WhatsApp</p>
    <img class="qr" src="${qr}" alt="Código QR">
    <p class="url">${visible}</p>
    <p class="pie">Apuntá la cámara de tu celular al código.<br>
    Después tocá <strong>&ldquo;Agregar a pantalla de inicio&rdquo;</strong> y te queda como app.</p>
  </div>
</body></html>`)

    ventana.document.close()
    ventana.focus()
    // Espera a que el logo y el QR estén cargados, si no imprime en blanco.
    setTimeout(() => ventana.print(), 400)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Dirección a la que apunta el QR
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') generar(url)
              }}
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000] transition-colors"
            />
            <button
              onClick={() => generar(url)}
              className="flex-shrink-0 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors"
            >
              Actualizar
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Por defecto apunta a este mismo sitio. Cambiala solo si sabés lo que hacés.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Vista previa del cartel */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center text-center">
        {generando ? (
          <div className="w-56 h-56 bg-gray-100 rounded-xl animate-pulse" />
        ) : qr ? (
          <>
            <h3 className="text-lg font-extrabold text-[#CC0000]">Kiosco Chatito</h3>
            <p className="text-sm font-semibold text-gray-600 mt-0.5">
              Escaneá y pedí por WhatsApp
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="Código QR del catálogo"
              className="w-56 h-56 my-4"
            />
            <p className="text-sm font-extrabold text-gray-800">
              {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </p>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={imprimir}
          disabled={!qr}
          className="bg-[#CC0000] hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Imprimir cartel
        </button>
        <a
          href={qr || undefined}
          download="qr-kiosco-chatito.png"
          className={`font-bold py-3 rounded-xl transition-colors text-center ${
            qr
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-gray-100 text-gray-300 pointer-events-none'
          }`}
        >
          Descargar QR
        </a>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Cómo usarlo:</strong> imprimí el cartel y pegalo en el mostrador. El cliente
          apunta la cámara, se le abre el catálogo y a los pocos segundos le aparece el cartel para
          instalar la app. El &ldquo;Descargar QR&rdquo; te sirve para publicarlo en Instagram o
          sumarlo a un volante.
        </p>
      </div>
    </div>
  )
}
