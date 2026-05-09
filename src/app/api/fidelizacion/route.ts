import { NextResponse, NextRequest } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  console.log('[fidelizacion] POST recibido')
  try {
    const body = await request.json()
    const { telefono, nombre, monto } = body
    console.log('[fidelizacion] body:', { telefono, nombre, monto, tipoMonto: typeof monto })

    if (!telefono?.trim() || !nombre?.trim() || typeof monto !== 'number' || monto <= 0) {
      console.error('[fidelizacion] validacion fallida:', { telefono, nombre, monto })
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const admin = crearClienteAdmin()

    const { data: config, error: configError } = await admin
      .from('configuracion')
      .select('puntos_por_monto')
      .single()

    console.log('[fidelizacion] config:', { config, configError: configError?.message })

    if (configError) {
      return NextResponse.json({ error: 'Error leyendo configuracion: ' + configError.message }, { status: 500 })
    }

    const pxm = config?.puntos_por_monto ?? 0
    console.log('[fidelizacion] puntos_por_monto:', pxm)

    if (pxm <= 0) {
      console.log('[fidelizacion] sistema desactivado (pxm=0), saliendo sin crear cliente')
      return NextResponse.json({ puntos_ganados: 0, puntos_acumulados: 0 })
    }

    const puntos_ganados = Math.floor(monto / pxm)
    console.log('[fidelizacion] puntos_ganados:', puntos_ganados)

    const { data: existente, error: busquedaError } = await admin
      .from('clientes')
      .select('id, puntos_acumulados')
      .eq('telefono', telefono.trim())
      .maybeSingle()

    console.log('[fidelizacion] cliente existente:', { existente, busquedaError: busquedaError?.message })

    if (busquedaError) {
      return NextResponse.json({ error: 'Error buscando cliente: ' + busquedaError.message }, { status: 500 })
    }

    let puntos_acumulados: number

    if (existente) {
      puntos_acumulados = existente.puntos_acumulados + puntos_ganados
      console.log('[fidelizacion] actualizando cliente', existente.id, '→ puntos:', puntos_acumulados)
      const { error: updateError } = await admin
        .from('clientes')
        .update({ nombre: nombre.trim(), puntos_acumulados })
        .eq('id', existente.id)
      if (updateError) {
        console.error('[fidelizacion] error al actualizar:', updateError)
        return NextResponse.json({ error: 'Error actualizando cliente: ' + updateError.message }, { status: 500 })
      }
    } else {
      puntos_acumulados = puntos_ganados
      console.log('[fidelizacion] insertando cliente nuevo:', { telefono: telefono.trim(), nombre: nombre.trim(), puntos_acumulados })
      const { error: insertError } = await admin
        .from('clientes')
        .insert({ telefono: telefono.trim(), nombre: nombre.trim(), puntos_acumulados })
      if (insertError) {
        console.error('[fidelizacion] error al insertar:', insertError)
        return NextResponse.json({ error: 'Error creando cliente: ' + insertError.message }, { status: 500 })
      }
    }

    console.log('[fidelizacion] OK:', { puntos_ganados, puntos_acumulados })
    return NextResponse.json({ puntos_ganados, puntos_acumulados })
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    console.error('[fidelizacion] excepcion:', mensaje)
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
