'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

const STORAGE_KEY = 'banner-instalacion-descartado'
const DIAS_ESPERA = 7

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type WindowConPrompt = Window & {
  __pwaInstallPrompt?: BeforeInstallPromptEvent
}

export default function BannerInstalacion() {
  const [visible, setVisible] = useState(false)
  const [esIOS, setEsIOS] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // No mostrar si ya está instalada como PWA
    const yaInstalada =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (yaInstalada) return

    // No mostrar si fue descartado recientemente
    const descartado = localStorage.getItem(STORAGE_KEY)
    if (descartado) {
      const transcurrido = Date.now() - parseInt(descartado, 10)
      if (transcurrido < DIAS_ESPERA * 24 * 60 * 60 * 1000) return
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setEsIOS(ios)

    if (!ios) {
      // El script inline en layout.tsx captura el evento antes de que React hidrate.
      // Si ya está guardado en window lo tomamos directamente; si no, escuchamos el evento.
      const win = window as WindowConPrompt
      if (win.__pwaInstallPrompt) {
        promptRef.current = win.__pwaInstallPrompt
      } else {
        const handler = (e: Event) => {
          e.preventDefault()
          promptRef.current = e as BeforeInstallPromptEvent
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    const timer = setTimeout(() => {
      if (ios || promptRef.current) setVisible(true)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  function cerrar() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setVisible(false)
  }

  async function instalar() {
    const prompt = promptRef.current
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    promptRef.current = null
    ;(window as WindowConPrompt).__pwaInstallPrompt = undefined
    if (outcome === 'accepted') setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pointer-events-none">
      <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 pointer-events-auto">
        <div className="flex items-start gap-3">
          <Image
            src="/logo.png"
            alt="Kiosco Chatito"
            width={48}
            height={48}
            className="rounded-xl flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-snug">
              Instalá nuestra app para pedir más rápido
            </p>
            {esIOS ? (
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                Tocá <strong>Compartir ↑</strong> y luego{' '}
                <strong>Agregar a inicio</strong>
              </p>
            ) : (
              <button
                onClick={instalar}
                className="mt-2 w-full bg-[#CC0000] hover:bg-red-700 text-white text-sm font-bold py-2 rounded-xl transition-colors"
              >
                Instalar
              </button>
            )}
          </div>
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-xl leading-none flex-shrink-0 mt-0.5"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
