import { NextResponse } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'
import { ipDe, limpiarIntentos, registrarFallo, segundosDeBloqueo } from '@/lib/rateLimit'

/**
 * Saldo de puntos de un cliente, buscado por teléfono.
 *
 * Es un endpoint público: la única forma de identificarse es el teléfono, que
 * el cliente ya escribe en el checkout. Por eso devuelve lo mínimo — el saldo y
 * cuánto falta para el premio — y nunca el nombre, el historial ni los pedidos.
 * Así, alguien que se pusiera a probar números al azar solo averiguaría que tal
 * teléfono tiene tantos puntos.
 *
 * Además, cada consulta que no encuentra a nadie cuenta como intento fallido:
 * probar números en serie bloquea la IP, mientras que el cliente real, que
 * acierta siempre, nunca se topa con el límite.
 */

export const dynamic = 'force-dynamic'

const MIN_DIGITOS = 6

export async function GET(request: Request) {
  try {
    const clave = `puntos:${ipDe(request)}`
    const bloqueo = segundosDeBloqueo(clave)
    if (bloqueo > 0) {
      return NextResponse.json(
        { error: `Demasiadas consultas. Probá de nuevo en ${Math.ceil(bloqueo / 60)} minutos.` },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const digitos = (searchParams.get('telefono') ?? '').replace(/\D/g, '')

    if (digitos.length < MIN_DIGITOS) {
      return NextResponse.json({ error: 'Ingresá un teléfono válido' }, { status: 400 })
    }

    const admin = crearClienteAdmin()

    const { data: config, error: errorConfig } = await admin
      .from('configuracion')
      .select('puntos_por_monto, puntos_para_canje, mensaje_canje')
      .single()

    if (errorConfig || !config) {
      return NextResponse.json({ error: 'No pudimos consultar los puntos' }, { status: 500 })
    }

    if ((config.puntos_por_monto ?? 0) <= 0) {
      return NextResponse.json({ activo: false })
    }

    // Puede haber más de una fila si el mismo número se cargó con distinto
    // formato antes de que existiera `telefono_digitos`. Se suman todas para
    // que el cliente vea el saldo completo.
    const { data: clientes, error: errorClientes } = await admin
      .from('clientes')
      .select('puntos_acumulados, puntos_canjeados')
      .eq('telefono_digitos', digitos)

    if (errorClientes) {
      return NextResponse.json({ error: 'No pudimos consultar los puntos' }, { status: 500 })
    }

    if (!clientes || clientes.length === 0) {
      registrarFallo(clave)
      return NextResponse.json({
        activo: true,
        encontrado: false,
        puntos: 0,
        puntos_para_canje: config.puntos_para_canje ?? 0,
        mensaje_canje: config.mensaje_canje ?? '',
      })
    }

    limpiarIntentos(clave)

    const puntos = clientes.reduce(
      (acc, c) => acc + (c.puntos_acumulados ?? 0) - (c.puntos_canjeados ?? 0),
      0
    )

    return NextResponse.json({
      activo: true,
      encontrado: true,
      puntos: Math.max(0, puntos),
      puntos_para_canje: config.puntos_para_canje ?? 0,
      mensaje_canje: config.mensaje_canje ?? '',
    })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
