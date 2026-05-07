'use client'

import { useState } from 'react'
import type { Pedido } from '@/types'

type Modo = 'hoy' | 'rango'
type CampoFechaHora = { fecha: string; hora: string }

function calcSubtotalItems(pedido: Pedido) {
  return pedido.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
}

function calcCostoEnvio(pedido: Pedido) {
  if (pedido.datos_cliente?.tipoEntrega !== 'envio') return 0
  return Math.max(0, pedido.total - calcSubtotalItems(pedido))
}

function hoyISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function parsearFechaHora(campo: CampoFechaHora): Date | null {
  if (!campo.fecha || !campo.hora) return null
  const d = new Date(`${campo.fecha}T${campo.hora}`)
  return isNaN(d.getTime()) ? null : d
}

async function cargarLogoBase64(): Promise<string | null> {
  try {
    const resp = await fetch('/logo.png')
    const blob = await resp.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export default function CierreCaja() {
  const [modo, setModo] = useState<Modo>('hoy')
  const [desdeInput, setDesdeInput] = useState<CampoFechaHora>({ fecha: hoyISO(), hora: '00:00' })
  const [hastaInput, setHastaInput] = useState<CampoFechaHora>({ fecha: hoyISO(), hora: '23:59' })
  const [errorFecha, setErrorFecha] = useState('')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [consultado, setConsultado] = useState(false)
  const [periodoLabel, setPeriodoLabel] = useState('')

  async function consultar() {
    setErrorFecha('')

    let desdeISO: string
    let hastaISO: string
    let label: string

    if (modo === 'hoy') {
      const inicio = new Date()
      inicio.setHours(0, 0, 0, 0)
      const fin = new Date()
      fin.setHours(23, 59, 59, 999)
      desdeISO = inicio.toISOString()
      hastaISO = fin.toISOString()
      label = `Hoy — ${inicio.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    } else {
      const dDesde = parsearFechaHora(desdeInput)
      const dHasta = parsearFechaHora(hastaInput)
      if (!dDesde || !dHasta) {
        setErrorFecha('Completá la fecha y hora de inicio y fin')
        return
      }
      if (dDesde >= dHasta) {
        setErrorFecha('La fecha de inicio debe ser anterior a la de fin')
        return
      }
      desdeISO = dDesde.toISOString()
      hastaISO = dHasta.toISOString()
      const fmt = (d: Date) =>
        d.toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      label = `${fmt(dDesde)} — ${fmt(dHasta)}`
    }

    setCargando(true)
    const res = await fetch(
      `/api/admin/pedidos?desde=${encodeURIComponent(desdeISO)}&hasta=${encodeURIComponent(hastaISO)}&estado=confirmado`
    )
    if (res.ok) setPedidos(await res.json())
    setPeriodoLabel(label)
    setConsultado(true)
    setCargando(false)
  }

  // Estadísticas
  const totalPedidos = pedidos.length
  const totalSubtotalProductos = pedidos.reduce((acc, p) => acc + calcSubtotalItems(p), 0)
  const totalEnvios = pedidos.reduce((acc, p) => acc + calcCostoEnvio(p), 0)
  const totalGeneral = pedidos.reduce((acc, p) => acc + p.total, 0)
  const pedidosEfectivo = pedidos.filter((p) => p.datos_cliente?.metodoPago !== 'transferencia')
  const pedidosTransferencia = pedidos.filter((p) => p.datos_cliente?.metodoPago === 'transferencia')
  const totalEfectivo = pedidosEfectivo.reduce((acc, p) => acc + p.total, 0)
  const totalTransferencia = pedidosTransferencia.reduce((acc, p) => acc + p.total, 0)

  async function exportarPDF() {
    setExportando(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      const L = 15
      const R = 195
      let y = 15

      // Logo + título
      const logoData = await cargarLogoBase64()
      if (logoData) {
        doc.addImage(logoData, 'PNG', L, y, 18, 18)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(16)
        doc.text('Kiosco Chatito', L + 22, y + 7)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.setTextColor(80)
        doc.text('Cierre de Caja', L + 22, y + 13)
        doc.setTextColor(0)
        y += 25
      } else {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(16)
        doc.text('Kiosco Chatito — Cierre de Caja', L, y + 6)
        y += 14
      }

      // Separador
      doc.setDrawColor(180)
      doc.line(L, y, R, y)
      y += 5

      // Período y fecha de generación
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(90)
      doc.text(`Período: ${periodoLabel}`, L, y)
      y += 4
      doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, L, y)
      doc.setTextColor(0)
      y += 9

      // ─── Resumen general ───
      const seccion = (titulo: string) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(0)
        doc.text(titulo, L, y)
        y += 3
        doc.setDrawColor(180)
        doc.line(L, y, R, y)
        y += 5
      }

      const fila = (label: string, valor: string, bold = false, colorValor?: [number, number, number]) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setFontSize(9)
        doc.setTextColor(0)
        doc.text(label, L, y)
        if (colorValor) doc.setTextColor(...colorValor)
        doc.text(valor, R, y, { align: 'right' })
        doc.setTextColor(0)
        y += 5
      }

      seccion('RESUMEN GENERAL')
      fila('Total de pedidos', String(totalPedidos))
      fila('Subtotal productos', `$${totalSubtotalProductos.toLocaleString('es-AR')}`)
      if (totalEnvios > 0) fila('Total envíos', `$${totalEnvios.toLocaleString('es-AR')}`)

      // Fila total destacada
      doc.setFillColor(204, 0, 0)
      doc.roundedRect(L, y - 1, R - L, 7, 1, 1, 'F')
      doc.setTextColor(255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TOTAL GENERAL', L + 2, y + 4)
      doc.text(`$${totalGeneral.toLocaleString('es-AR')}`, R - 2, y + 4, { align: 'right' })
      doc.setTextColor(0)
      y += 12

      seccion('MÉTODOS DE PAGO')
      fila(`Efectivo (${pedidosEfectivo.length} pedidos)`, `$${totalEfectivo.toLocaleString('es-AR')}`)
      fila(`Transferencia (${pedidosTransferencia.length} pedidos)`, `$${totalTransferencia.toLocaleString('es-AR')}`)
      y += 2

      seccion('DETALLE DE PEDIDOS')

      for (const pedido of pedidos) {
        const itemsHeight = pedido.items.length * 5 + 20
        if (y + itemsHeight > 270) {
          doc.addPage()
          y = 15
        }

        const dc = pedido.datos_cliente
        const hora = new Date(pedido.created_at).toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
        })
        const nombre = dc?.nombre ?? '—'
        const pago = dc?.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'
        const entrega = dc?.tipoEntrega === 'envio' ? 'Envío' : 'Retiro'
        const costoEnvio = calcCostoEnvio(pedido)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(`${hora} hs — ${nombre}`, L, y)
        doc.text(`$${pedido.total.toLocaleString('es-AR')}`, R, y, { align: 'right' })
        y += 4

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100)
        doc.text(`${pago} | ${entrega}`, L + 3, y)
        doc.setTextColor(0)
        y += 4

        for (const item of pedido.items) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.text(`  ${item.cantidad}x ${item.nombre}`, L + 3, y)
          doc.setTextColor(80)
          doc.text(`$${(item.precio * item.cantidad).toLocaleString('es-AR')}`, R, y, { align: 'right' })
          doc.setTextColor(0)
          y += 4
        }

        if (costoEnvio > 0) {
          doc.setTextColor(120)
          doc.setFontSize(8)
          doc.text('  Costo de envío', L + 3, y)
          doc.text(`$${costoEnvio.toLocaleString('es-AR')}`, R, y, { align: 'right' })
          doc.setTextColor(0)
          y += 4
        }

        doc.setDrawColor(220)
        doc.line(L, y, R, y)
        y += 4
      }

      // Pie con total final
      y += 2
      doc.setDrawColor(0)
      doc.line(L, y, R, y)
      y += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(204, 0, 0)
      doc.text('TOTAL GENERAL', L, y)
      doc.text(`$${totalGeneral.toLocaleString('es-AR')}`, R, y, { align: 'right' })

      doc.save(`cierre-${hoyISO()}.pdf`)
    } finally {
      setExportando(false)
    }
  }

  function imprimir() {
    const ventana = window.open('', '_blank', 'width=800,height=700')
    if (!ventana) return

    const itemsHtml = pedidos
      .map((p) => {
        const dc = p.datos_cliente
        const hora = new Date(p.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        const costoEnvio = calcCostoEnvio(p)
        return `<div class="pedido">
          <div class="fila"><strong>${hora} hs — ${dc?.nombre ?? '—'}</strong><strong>$${p.total.toLocaleString('es-AR')}</strong></div>
          <div class="meta">${dc?.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'} | ${dc?.tipoEntrega === 'envio' ? 'Envío a domicilio' : 'Retiro en local'}</div>
          <ul>${p.items.map((i) => `<li>${i.cantidad}× ${i.nombre}<span>$${(i.precio * i.cantidad).toLocaleString('es-AR')}</span></li>`).join('')}
          ${costoEnvio > 0 ? `<li class="envio">Costo de envío<span>$${costoEnvio.toLocaleString('es-AR')}</span></li>` : ''}</ul>
        </div>`
      }).join('')

    ventana.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Cierre de Caja — Kiosco Chatito</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:24px;color:#111}
h1{font-size:16px;text-align:center;margin-bottom:2px}.sub{text-align:center;color:#555;font-size:11px;margin-bottom:4px}
.gen{text-align:center;color:#999;font-size:10px;margin-bottom:16px}.sec{font-weight:bold;border-bottom:1px solid #999;padding-bottom:2px;margin:12px 0 6px;font-size:11px}
.fila{display:flex;justify-content:space-between;padding:2px 0;font-size:12px}.tot{font-weight:bold;border-top:2px solid #111;padding-top:4px;margin-top:4px}
.pedido{border-bottom:1px dashed #ccc;padding:6px 0}.meta{font-size:10px;color:#666;margin:2px 0 4px}
ul{list-style:none;padding-left:12px}li{display:flex;justify-content:space-between;font-size:11px;padding:1px 0}
li.envio{color:#555;border-top:1px dotted #ccc;margin-top:2px;padding-top:2px}@media print{body{padding:0}}</style>
</head><body>
<h1>Kiosco Chatito — Cierre de Caja</h1>
<p class="sub">${periodoLabel}</p><p class="gen">Generado: ${new Date().toLocaleString('es-AR')}</p>
<div class="sec">Resumen General</div>
<div class="fila"><span>Total de pedidos</span><span>${totalPedidos}</span></div>
<div class="fila"><span>Subtotal productos</span><span>$${totalSubtotalProductos.toLocaleString('es-AR')}</span></div>
${totalEnvios > 0 ? `<div class="fila"><span>Total envíos</span><span>$${totalEnvios.toLocaleString('es-AR')}</span></div>` : ''}
<div class="fila tot"><span>TOTAL GENERAL</span><span>$${totalGeneral.toLocaleString('es-AR')}</span></div>
<div class="sec">Métodos de Pago</div>
<div class="fila"><span>Efectivo (${pedidosEfectivo.length} pedidos)</span><span>$${totalEfectivo.toLocaleString('es-AR')}</span></div>
<div class="fila"><span>Transferencia (${pedidosTransferencia.length} pedidos)</span><span>$${totalTransferencia.toLocaleString('es-AR')}</span></div>
<div class="sec">Detalle de Pedidos</div>${itemsHtml}
<div class="fila tot" style="margin-top:12px"><span>TOTAL GENERAL</span><span>$${totalGeneral.toLocaleString('es-AR')}</span></div>
</body></html>`)
    ventana.document.close()
    ventana.print()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selector de modo */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Período de consulta</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['hoy', 'rango'] as Modo[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setModo(m); setErrorFecha('') }}
              className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                modo === m
                  ? 'border-[#CC0000] bg-red-50 text-[#CC0000]'
                  : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              {m === 'hoy' ? 'Pedidos de hoy' : 'Rango personalizado'}
            </button>
          ))}
        </div>

        {modo === 'rango' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <InputFechaHora
              label="Desde"
              valor={desdeInput}
              onChange={setDesdeInput}
            />
            <InputFechaHora
              label="Hasta"
              valor={hastaInput}
              onChange={setHastaInput}
            />
          </div>
        )}

        {errorFecha && (
          <p className="text-xs text-red-500 mb-3">{errorFecha}</p>
        )}

        <button
          onClick={consultar}
          disabled={cargando}
          className="w-full bg-[#CC0000] hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {cargando ? 'Cargando...' : 'Consultar'}
        </button>
      </div>

      {/* Resultados */}
      {consultado && !cargando && (
        <>
          {pedidos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No hay pedidos en este período</p>
            </div>
          ) : (
            <>
              {/* Botones de acción */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={imprimir}
                  className="border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Imprimir
                </button>
                <button
                  onClick={exportarPDF}
                  disabled={exportando}
                  className="border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  {exportando ? 'Generando...' : 'Exportar PDF'}
                </button>
              </div>

              {/* Resumen */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Resumen</p>
                <p className="text-xs text-gray-400 mb-4">{periodoLabel}</p>

                <div className="flex flex-col gap-2">
                  <FilaResumen label="Total de pedidos" valor={String(totalPedidos)} />
                  <FilaResumen
                    label="Subtotal productos"
                    valor={`$${totalSubtotalProductos.toLocaleString('es-AR')}`}
                  />
                  {totalEnvios > 0 && (
                    <FilaResumen
                      label="Total envíos"
                      valor={`$${totalEnvios.toLocaleString('es-AR')}`}
                    />
                  )}
                  {/* Total general destacado */}
                  <div className="flex justify-between items-center bg-[#CC0000] rounded-xl px-4 py-3 mt-1">
                    <span className="text-white font-bold text-sm">Total general</span>
                    <span className="text-white font-extrabold text-xl tabular-nums">
                      ${totalGeneral.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desglose por pago */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Por método de pago</p>
                <div className="flex flex-col gap-2">
                  <FilaResumen
                    label={`Efectivo (${pedidosEfectivo.length} pedidos)`}
                    valor={`$${totalEfectivo.toLocaleString('es-AR')}`}
                  />
                  <FilaResumen
                    label={`Transferencia (${pedidosTransferencia.length} pedidos)`}
                    valor={`$${totalTransferencia.toLocaleString('es-AR')}`}
                  />
                </div>
              </div>

              {/* Listado de pedidos */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-gray-700">
                  Pedidos ({totalPedidos})
                </p>
                {pedidos.map((pedido) => {
                  const dc = pedido.datos_cliente
                  const costoEnvio = calcCostoEnvio(pedido)
                  return (
                    <div key={pedido.id} className="bg-white rounded-xl border border-gray-100 p-3">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {dc?.nombre ?? '—'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(pedido.created_at).toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            hs ·{' '}
                            {dc?.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'} ·{' '}
                            {dc?.tipoEntrega === 'envio' ? 'Envío' : 'Retiro'}
                          </p>
                        </div>
                        <span className="text-sm font-extrabold text-[#CC0000] tabular-nums">
                          ${pedido.total.toLocaleString('es-AR')}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-0.5 border-t border-gray-50 pt-2">
                        {pedido.items.map((item, i) => (
                          <li key={i} className="flex justify-between text-xs text-gray-600">
                            <span>{item.cantidad}× {item.nombre}</span>
                            <span className="tabular-nums">
                              ${(item.precio * item.cantidad).toLocaleString('es-AR')}
                            </span>
                          </li>
                        ))}
                        {costoEnvio > 0 && (
                          <li className="flex justify-between text-xs text-gray-400 border-t border-dashed border-gray-100 mt-1 pt-1">
                            <span>Costo de envío</span>
                            <span className="tabular-nums">
                              ${costoEnvio.toLocaleString('es-AR')}
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  )
                })}

                {/* Resumen al pie del listado */}
                <div className="bg-[#CC0000] rounded-xl px-4 py-3 flex justify-between items-center mt-1">
                  <div>
                    <p className="text-white font-bold text-sm">Total general</p>
                    <p className="text-white/70 text-xs">{totalPedidos} pedidos · {periodoLabel}</p>
                  </div>
                  <span className="text-white font-extrabold text-xl tabular-nums">
                    ${totalGeneral.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function FilaResumen({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold tabular-nums text-gray-800">{valor}</span>
    </div>
  )
}

const claseInput =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#CC0000] bg-white input-fecha-admin'

function InputFechaHora({
  label,
  valor,
  onChange,
}: {
  label: string
  valor: CampoFechaHora
  onChange: (v: CampoFechaHora) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <input
        type="date"
        value={valor.fecha}
        onChange={(e) => onChange({ ...valor, fecha: e.target.value })}
        className={claseInput}
      />
      <input
        type="time"
        value={valor.hora}
        onChange={(e) => onChange({ ...valor, hora: e.target.value })}
        className={claseInput}
      />
    </div>
  )
}
