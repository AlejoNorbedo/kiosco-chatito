'use client'

import { useState, useRef } from 'react'
import type { Producto } from '@/types'

type Campos = {
  nombre: string
  precio: string
  precio_oferta: string
  categoria: string
  subcategoria: string
  stock: string
  imagen_url: string
  activo: boolean
  destacado: boolean
  suma_puntos: boolean
  recargo_transferencia: boolean
}

type Props = {
  producto?: Producto
  onGuardar: (datos: Partial<Producto>) => Promise<void>
  onCerrar: () => void
  subcategoriasExistentes?: string[]
}

export default function FormularioProducto({ producto, onGuardar, onCerrar, subcategoriasExistentes = [] }: Props) {
  const [campos, setCampos] = useState<Campos>({
    nombre: producto?.nombre ?? '',
    precio: producto?.precio?.toString() ?? '',
    precio_oferta: producto?.precio_oferta?.toString() ?? '',
    categoria: producto?.categoria ?? '',
    subcategoria: producto?.subcategoria ?? '',
    stock: producto?.stock?.toString() ?? '0',
    imagen_url: producto?.imagen_url ?? '',
    activo: producto?.activo ?? true,
    destacado: producto?.destacado ?? false,
    suma_puntos: producto?.suma_puntos ?? true,
    recargo_transferencia: producto?.recargo_transferencia ?? false,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

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
    const precio_oferta = campos.precio_oferta.trim() !== '' ? parseFloat(campos.precio_oferta) : null

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
    if (precio_oferta !== null && (isNaN(precio_oferta) || precio_oferta < 0)) {
      setError('El precio de oferta debe ser un número válido')
      setGuardando(false)
      return
    }
    if (precio_oferta !== null && precio_oferta >= precio) {
      setError('El precio de oferta debe ser menor al precio normal')
      setGuardando(false)
      return
    }

    try {
      await onGuardar({
        nombre: campos.nombre.trim(),
        precio,
        precio_oferta,
        categoria: campos.categoria.trim(),
        subcategoria: campos.subcategoria.trim() || null,
        stock,
        imagen_url: campos.imagen_url.trim() || null,
        activo: campos.activo,
        destacado: campos.destacado,
        suma_puntos: campos.suma_puntos,
        recargo_transferencia: campos.recargo_transferencia,
      })
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {producto ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={enviar} className="overflow-y-auto p-5 flex flex-col gap-4">
          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Imagen</label>

            {imagenActual && (
              <div className="relative mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagenActual}
                  alt="Preview del producto"
                  className="w-full h-44 object-cover rounded-xl border border-gray-200"
                />
                {subiendo && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-xl gap-2">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-white text-xs font-medium">Subiendo...</span>
                  </div>
                )}
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

            <input ref={inputRef} type="file" accept="image/*" onChange={manejarArchivo} className="hidden" />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="w-full border-2 border-dashed border-gray-200 hover:border-[#CC0000] rounded-xl py-3 text-sm text-gray-400 hover:text-[#CC0000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subiendo ? 'Subiendo imagen...' : imagenActual ? '📷 Cambiar imagen' : '📷 Subir imagen'}
            </button>

            {errorImagen && <p className="text-red-500 text-xs mt-1">{errorImagen}</p>}
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
              placeholder="Bebidas, Golosinas, Cigarrillos..."
              required
              className={estiloInput}
            />
          </Campo>

          <Campo label="Subcategoría">
            <input
              type="text"
              list="subcategorias-list"
              value={campos.subcategoria}
              onChange={(e) => actualizar('subcategoria', e.target.value)}
              placeholder="Marlboro, Coca-Cola... (opcional)"
              className={estiloInput}
            />
            {subcategoriasExistentes.length > 0 && (
              <datalist id="subcategorias-list">
                {subcategoriasExistentes.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Agrupa productos dentro de una misma categoría
            </p>
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

          <Campo label="Precio de oferta ($)">
            <input
              type="number"
              value={campos.precio_oferta}
              onChange={(e) => actualizar('precio_oferta', e.target.value)}
              min="0"
              step="0.01"
              placeholder="Dejar vacío si no hay oferta"
              className={estiloInput}
            />
            <p className="text-xs text-gray-400 mt-1">
              Si se completa, se muestra el precio tachado y el badge OFERTA.
            </p>
          </Campo>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={campos.activo}
                onChange={(e) => actualizar('activo', e.target.checked)}
                className="w-4 h-4 accent-green-500"
              />
              <span className="text-sm font-medium text-gray-700">Producto activo (visible)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={campos.destacado}
                onChange={(e) => actualizar('destacado', e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="text-sm font-medium text-gray-700">Destacado (aparece en la sección especial)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={campos.suma_puntos}
                onChange={(e) => actualizar('suma_puntos', e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Suma puntos de fidelización</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={campos.recargo_transferencia}
                onChange={(e) => actualizar('recargo_transferencia', e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">Recargo por transferencia</span>
            </label>
          </div>

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
              className="flex-1 bg-[#CC0000] hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
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
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-[#CC0000]'

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
