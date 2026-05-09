import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const { telefono, nombre, monto } = await request.json()

    if (!telefono?.trim() || !nombre?.trim() || typeof monto !== 'number' || monto <= 0) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const admin = crearClienteAdmin()

    const { data: config, error: configError } = await admin
      .from('configuracion')
      .select('puntos_por_monto')
      .single()

    if (configError) {
      return NextResponse.json({ error: 'Error leyendo configuracion' }, { status: 500 })
    }

    const pxm = config?.puntos_por_monto ?? 0
    if (pxm <= 0) {
      return NextResponse.json({ puntos_ganados: 0, puntos_acumulados: 0 })
    }

    const puntos_ganados = Math.floor(monto / pxm)

    const { data: existente, error: busquedaError } = await admin
      .from('clientes')
      .select('id, puntos_acumulados')
      .eq('telefono', telefono.trim())
      .maybeSingle()

    if (busquedaError) {
      return NextResponse.json({ error: 'Error buscando cliente' }, { status: 500 })
    }

    let clienteId: string
    let puntos_acumulados: number

    if (existente) {
      puntos_acumulados = existente.puntos_acumulados + puntos_ganados
      clienteId = existente.id
      const { error: updateError } = await admin
        .from('clientes')
        .update({ nombre: nombre.trim(), puntos_acumulados })
        .eq('id', existente.id)
      if (updateError) {
        return NextResponse.json({ error: 'Error actualizando cliente' }, { status: 500 })
      }
    } else {
      puntos_acumulados = puntos_ganados
      const { data: nuevo, error: insertError } = await admin
        .from('clientes')
        .insert({ telefono: telefono.trim(), nombre: nombre.trim(), puntos_acumulados })
        .select('id')
        .single()
      if (insertError || !nuevo) {
        return NextResponse.json({ error: 'Error creando cliente' }, { status: 500 })
      }
      clienteId = nuevo.id
    }

    // Loggear movimiento en historial
    await admin.from('historial_puntos').insert({
      cliente_id: clienteId,
      concepto: 'Compra',
      puntos: puntos_ganados,
    })

    return NextResponse.json({ puntos_ganados, puntos_acumulados })
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
