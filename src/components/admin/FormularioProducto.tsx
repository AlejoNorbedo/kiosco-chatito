'use client'

import { useState } from 'react'
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

  function actualizar(campo: keyof Campos, valor: string | boolean) {
    setCampos((prev) => ({ ...prev, [campo]: valor }))
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
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

          <Campo label="URL de imagen (opcional)">
            <input
              type="url"
              value={campos.imagen_url}
              onChange={(e) => actualizar('imagen_url', e.target.value)}
              placeholder="https://..."
              className={estiloInput}
            />
          </Campo>

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
              disabled={guardando}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
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
