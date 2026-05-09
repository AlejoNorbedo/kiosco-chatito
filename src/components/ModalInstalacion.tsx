'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const STORAGE_KEY = 'pwa-modal-mostrado'

export default function ModalInstalacion() {
  const [visible, setVisible] = useState(false)
  const [dispositivo, setDispositivo] = useState<'android' | 'ios' | 'otro'>('otro')

  useEffect(() => {
    const yaInstalada =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (yaInstalada) return

    if (localStorage.getItem(STORAGE_KEY)) return

    const ua = navigator.userAgent
    if (/iphone|ipad|ipod/i.test(ua)) {
      setDispositivo('ios')
    } else if (/android/i.test(ua)) {
      setDispositivo('android')
    }

    const timer = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  function cerrar() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={cerrar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="relative flex flex-col items-center px-6 pt-6 pb-4">
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xl leading-none transition-colors"
          >
            ×
          </button>
          <Image
            src="/logo.png"
            alt="Kiosco Chatito"
            width={72}
            height={72}
            className="rounded-2xl mb-3"
          />
          <h2 className="text-xl font-extrabold text-[#CC0000] text-center">
            Instalá nuestra app
          </h2>
          <p className="text-sm text-gray-500 text-center mt-1 leading-snug">
            Accedé al kiosco más rápido desde tu celular
          </p>
        </div>

        {/* Instrucciones */}
        <div className="px-6 pb-4 flex flex-col gap-3">
          {dispositivo !== 'ios' && (
            <Seccion titulo={dispositivo === 'otro' ? 'Android' : undefined}>
              <Paso numero={1} icono={<IconoTresPuntos />}>
                Tocá los tres puntitos <strong>(⋮)</strong> arriba a la derecha
              </Paso>
              <Paso numero={2} icono={<IconoAgregar />}>
                Elegí <strong>&ldquo;Agregar a pantalla de inicio&rdquo;</strong>
              </Paso>
            </Seccion>
          )}
          {dispositivo !== 'android' && (
            <Seccion titulo={dispositivo === 'otro' ? 'iPhone' : undefined}>
              <Paso numero={1} icono={<IconoCompartir />}>
                Tocá el botón <strong>Compartir (↑)</strong> en la barra inferior
              </Paso>
              <Paso numero={2} icono={<IconoAgregar />}>
                Elegí <strong>&ldquo;Agregar a inicio&rdquo;</strong>
              </Paso>
            </Seccion>
          )}
        </div>

        {/* Botón */}
        <div className="px-6 pb-6">
          <button
            onClick={cerrar}
            className="w-full bg-[#CC0000] hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {titulo && (
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">
          {titulo}
        </p>
      )}
      {children}
    </div>
  )
}

function Paso({
  numero,
  icono,
  children,
}: {
  numero: number
  icono: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
      <span className="w-6 h-6 rounded-full bg-[#CC0000] text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">
        {numero}
      </span>
      <span className="text-[#CC0000] flex-shrink-0">{icono}</span>
      <p className="text-sm text-gray-700 leading-snug">{children}</p>
    </div>
  )
}

function IconoTresPuntos() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

function IconoCompartir() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function IconoAgregar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}
