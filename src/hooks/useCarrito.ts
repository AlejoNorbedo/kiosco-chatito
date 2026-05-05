'use client'

import { useState, useEffect } from 'react'
import type { Producto, ItemCarrito } from '@/types'

const CLAVE_STORAGE = 'kiosco-carrito'

export function useCarrito() {
  const [items, setItems] = useState<ItemCarrito[]>([])
  const [cargando, setCargando] = useState(true)

  // Cargar carrito guardado al iniciar
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE)
      if (guardado) setItems(JSON.parse(guardado))
    } catch {
      // Si hay error en el storage, arrancamos con carrito vacío
    } finally {
      setCargando(false)
    }
  }, [])

  // Sincronizar con localStorage cada vez que cambia el carrito
  useEffect(() => {
    if (!cargando) {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items))
    }
  }, [items, cargando])

  function agregar(producto: Producto) {
    setItems((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id)
      if (existente) {
        return prev.map((i) =>
          i.producto.id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  function quitar(productoId: string) {
    setItems((prev) => {
      const existente = prev.find((i) => i.producto.id === productoId)
      if (!existente) return prev
      if (existente.cantidad === 1) {
        return prev.filter((i) => i.producto.id !== productoId)
      }
      return prev.map((i) =>
        i.producto.id === productoId
          ? { ...i, cantidad: i.cantidad - 1 }
          : i
      )
    })
  }

  function vaciar() {
    setItems([])
  }

  const totalItems = items.reduce((acc, i) => acc + i.cantidad, 0)
  const totalPrecio = items.reduce(
    (acc, i) => acc + i.producto.precio * i.cantidad,
    0
  )

  return { items, agregar, quitar, vaciar, totalItems, totalPrecio, cargando }
}
