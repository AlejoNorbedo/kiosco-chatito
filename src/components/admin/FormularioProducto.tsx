'use client'

import { useState, useRef } from 'react'
import type { Producto } from '@/types'

type Campos = {
  nombre: string
  precio: string
  categoria: string
  stock: string
  imagen_url: string
  activo: boolean
}

type Props = {
  producto?: Producto
  onGuardar: (datos: Partial<Producto>) => Promise<void>
  onCerrar: () => void
}

export default function FormularioProducto({ producto, onGuardar, onCerrar }: Props) {
  const [campos, setCampos] = useState<Campos>({
    nombre: producto?.nombre ?? '',
    precio: producto?.precio?.toString() ?? '',
    categoria: producto?.categoria ?? '',
    stock: producto?.stock?.toString() ?? '0',
    imagen_url: producto?.imagen_url ?? '',
    activo: producto?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Estado de imagen
  const [previewLocal, setPreviewLocal] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [errorImagen, setErrorImagen] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function actualizar(campo: keyof Campos, valor: string | boolean) {
    setCampos((prev) => ({ ...prev, [campo]: valor }))
  }

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    if (!archivo.type.startsWith('image/')) {
      setErrorImagen('Solo se permiten imágenes (JPG, PNG, WebP)')
      return
    }
    if (archivo.size > 5 * 1024 * 1024) {
      setErrorImagen('La imagen no puede superar 5MB')
      return
    }

    setErrorImagen('')
    // Preview local inmediato mientras sube en segundo plano
    setPreviewLocal(URL.createObjectURL(archivo))

    setSubiendo(true)
    try {
      const form = new FormData()
      form.append('imagen', archivo)
      const res = await fetch('/api/admin/storage', { method: 'POST', body: form })

      if (!res.ok) {
        const { error: detalle } = await res.json()
        setErrorImagen(detalle ?? 'Error al subir la imagen')
        setPreviewLocal(null)
        return
      }

      const { url } = await res.json()
      actualizar('imagen_url', url)
    } finally {
      setSubiendo(false)
    }
  }

  function quitarImagen() {
    setPreviewLocal(null)
    actualizar('imagen_url', '')
    setErrorImagen('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const imagenActual = previewLocal || campos.imagen_url || null

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (subiendo) return
    setGuardando(true)
    setError('')

    const precio = parseFloat(campos.precio)
    const stock = parseInt(campos.stock, 10)

    if (isNaN(precio) || precio < 0) {
      setError('El precio debe ser un número válido')
      setGuardando(false)
      return
    }
    if (isNaN(stock) || stock < 0) {
      setError('El stock debe ser un número entero válido')
      setGuardando(false)
      return
    }

    try {
      await onGuardar({
        nombre: campos.nombre.trim(),
        precio,
        categoria: campos.categoria.trim(),
        stock,
        imagen_url: campos.imagen_url.trim() || null,
        activo: campos.activo,
      })
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {producto ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={enviar} className="overflow-y-auto p-5 flex flex-col gap-4">
          {/* Bloque de imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Imagen</label>

            {/* Preview */}
            {imagenActual && (
              <div className="relative mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagenActual}
                  alt="Preview del producto"
                  className="w-full h-44 object-cover rounded-xl border border-gray-200"
                />
                {/* Overlay de carga */}
                {subiendo && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-xl gap-2">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-white text-xs font-medium">Subiendo...</span>
                  </div>
                )}
                {/* Botón quitar (solo cuando no está subiendo) */}
                {!subiendo && (
                  <button
                    type="button"
                    onClick={quitarImagen}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-lg leading-none transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Input oculto */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={manejarArchivo}
              className="hidden"
            />

            {/* Botón de subida */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="w-full border-2 border-dashed border-gray-200 hover:border-green-400 rounded-xl py-3 text-sm text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subiendo
                ? 'Subiendo imagen...'
                : imagenActual
                  ? '📷 Cambiar imagen'
                  : '📷 Subir imagen'}
            </button>

            {errorImagen && (
              <p className="text-red-500 text-xs mt-1">{errorImagen}</p>
            )}
          </div>

          <Campo label="Nombre" requerido>
            <input
              type="text"
              value={campos.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
              required
              className={estiloInput}
            />
          </Campo>

          <Campo label="Categoría" requerido>
            <input
              type="text"
              value={campos.categoria}
              onChange={(e) => actualizar('categoria', e.target.value)}
              placeholder="Bebidas, Golosinas..."
              required
              className={estiloInput}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Precio ($)" requerido>
              <input
                type="number"
                value={campos.precio}
                onChange={(e) => actualizar('precio', e.target.value)}
                min="0"
                step="0.01"
                required
                className={estiloInput}
              />
            </Campo>
            <Campo label="Stock">
              <input
                type="number"
                value={campos.stock}
                onChange={(e) => actualizar('stock', e.target.value)}
                min="0"
                step="1"
                className={estiloInput}
              />
            </Campo>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={campos.activo}
              onChange={(e) => actualizar('activo', e.target.checked)}
              className="w-4 h-4 accent-green-500"
            />
            <span className="text-sm font-medium text-gray-700">Producto activo (visible)</span>
          </label>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || subiendo}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {subiendo ? 'Esperá...' : guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const estiloInput =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-400'

function Campo({
  label,
  requerido,
  children,
}: {
  label: string
  requerido?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {requerido && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
