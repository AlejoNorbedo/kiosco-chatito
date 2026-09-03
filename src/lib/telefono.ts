/**
 * Normalización de teléfonos argentinos.
 *
 * El cliente escribe su número distinto cada vez y se guarda tal cual lo tipeó
 * en el checkout:
 *
 *     2227541859        +54 222 754-1859        0222 754-1859
 *     (222) 754 1859    +54 9 222 7541859       222 15 754 1859
 *
 * En la base, `clientes.telefono_digitos` guarda `right(solo_digitos, 10)`: los
 * últimos 10 dígitos son el número argentino real (área + abonado), así que los
 * prefijos que van adelante —el 54 del país, el 9 de celular, el 0 de larga
 * distancia— se descartan solos.
 *
 * El 15 es el único que no cae ahí, porque va en el medio: después del código
 * de área, que puede tener 2, 3 o 4 dígitos. Por eso esta función devuelve
 * varias formas posibles del mismo número, para buscarlas todas.
 */

export const MIN_DIGITOS_TELEFONO = 6

export function variantesTelefono(entrada: string): string[] {
  const digitos = entrada.replace(/\D/g, '')
  if (digitos.length < MIN_DIGITOS_TELEFONO) return []

  let d = digitos
  if (d.startsWith('54')) d = d.slice(2) // país
  if (d.startsWith('9')) d = d.slice(1) // celular
  if (d.startsWith('0')) d = d.slice(1) // larga distancia

  const candidatos = new Set<string>()

  // Un número argentino completo, sin el 15, tiene 10 dígitos.
  if (d.length === 10) candidatos.add(d)

  // Con el 15 quedan 12, y el 15 va justo después del código de área.
  if (d.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (d.slice(largoArea, largoArea + 2) === '15') {
        candidatos.add(d.slice(0, largoArea) + d.slice(largoArea + 2))
      }
    }
  }

  // Números que no siguen el formato: se prueba tal cual quedó. La búsqueda es
  // por igualdad exacta contra `right(telefono, 10)`, así que un número corto
  // solo puede coincidir con otro igual de corto — no se cuela en uno largo.
  if (candidatos.size === 0) candidatos.add(d.slice(-10))

  return Array.from(candidatos).filter((c) => c.length >= MIN_DIGITOS_TELEFONO)
}
