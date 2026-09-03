import type { Configuracion } from '@/types'

/**
 * Valores por defecto mientras la configuración real llega de Supabase.
 *
 * Vive acá porque lo usan el carrito y el panel admin: tenerlo duplicado hacía
 * que agregar una columna a `configuracion` obligara a acordarse de tocar los
 * dos lugares.
 */
export const CONFIG_DEFECTO: Configuracion = {
  costo_envio: 0,
  tiempo_entrega_activo: false,
  tiempo_entrega_texto: '30-45 minutos',
  telefono_requerido: false,
  monto_minimo: 0,
  puntos_por_monto: 0,
  puntos_para_canje: 0,
  mensaje_canje: '',
  horario_activo: false,
  horario_apertura: '09:00',
  horario_cierre: '22:00',
  dias_activos: [0, 1, 2, 3, 4, 5, 6],
  recargo_transferencia_pct: 0,
}

const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6]

/** Si el horario está apagado, el kiosco se considera siempre abierto. */
export function estaAbierto(
  config: Pick<
    Configuracion,
    'horario_activo' | 'horario_apertura' | 'horario_cierre' | 'dias_activos'
  >
): boolean {
  if (!config.horario_activo) return true

  const ahora = new Date()
  if (!(config.dias_activos ?? TODOS_LOS_DIAS).includes(ahora.getDay())) return false

  const [hApertura, mApertura] = config.horario_apertura.split(':').map(Number)
  const [hCierre, mCierre] = config.horario_cierre.split(':').map(Number)
  const minutos = ahora.getHours() * 60 + ahora.getMinutes()

  return minutos >= hApertura * 60 + mApertura && minutos < hCierre * 60 + mCierre
}
