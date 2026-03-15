import type { Valor, Palo } from './types'

// Valores que se convierten en MUESTRAS (no incluye 1,3,6,7,12)
export const VALORES_MUESTRA: Valor[] = [2, 4, 5, 10, 11]

// Valor de las muestras para ENVIDO / FLOR
// (20 + este valor = puntos totales de la pieza)
export const VALOR_ENVIDO_MUESTRA: Record<number, number> = {
  2: 10,
  4: 9,
  5: 8,
  11: 7,
  10: 7,
}

/**
 * Retorna el rango de una carta para el TRUCO.
 * Mayor número = carta más alta.
 *
 * Jerarquía uruguaya (de mayor a menor):
 *   Piezas:  2m > 4m > 5m > 11m > 10m
 *   Matas:   1♠ > 1♣ > 7♠ > 7♦
 *   Chicas:  3  > 2(no-pieza) > 1♥/1♦
 *   Negras:  12 > 11(no-pieza) > 10(no-pieza)
 *   Comunes: 7♣/7♥ > 6 > 5(no-pieza) > 4(no-pieza)
 */
export function getRankTruco(
  valor: Valor,
  palo: Palo,
  palMuestra: Palo | null,
  esMuestra: boolean,
  esComodin: boolean,
  valorMuestra?: Valor | null
): number {
  const rankMuestras: Record<number, number> = {
    2: 105, 4: 104, 5: 103, 11: 102, 10: 101,
  }

  // Comodín: mismo rango que la pieza muestra que representa
  if (esComodin) {
    return rankMuestras[valorMuestra ?? 0] ?? 104
  }

  // Piezas (palo muestra, valores especiales)
  if (esMuestra) {
    return rankMuestras[valor] ?? 100
  }

  // Matas (bravas)
  if (valor === 1 && palo === 'espadas') return 55
  if (valor === 1 && palo === 'bastos')  return 54
  if (valor === 7 && palo === 'espadas') return 53
  if (valor === 7 && palo === 'oros')    return 52

  // Chicas
  if (valor === 3) return 30
  if (valor === 2) return 29                                 // 2 no-pieza
  if (valor === 1) return 28                                 // 1 de copa o de oros

  // Negras (figuras no-piezas)
  if (valor === 12) return 20
  if (valor === 11) return 19
  if (valor === 10) return 18

  // Comunes
  if (valor === 7) return 10                                 // 7 bastos/copas (no-mata)
  if (valor === 6) return 9
  if (valor === 5) return 8
  if (valor === 4) return 7

  return 0
}

/**
 * Valor de una carta para el ENVIDO (cartas normales).
 * Figuras (10, 11, 12) valen 0. Resto vale su número.
 */
export function getValorEnvido(valor: Valor): number {
  if ([10, 11, 12].includes(valor)) return 0
  return valor
}

// ─────────────────────────────────────────────
// SEÑAS
// ─────────────────────────────────────────────

export type TipoSeña =
  | 'levantar_cejas'    // 2 pieza  — la más fuerte
  | 'beso'              // 4 pieza
  | 'arrugar_nariz'     // 5 pieza
  | 'guino_derecho'     // 11 pieza (caballo muestra)
  | 'guino_izquierdo'   // 10 pieza (sota muestra)
  | 'mueca_derecha'     // 1 de espadas (mata)
  | 'mueca_izquierda'   // 7 de espadas (mata)
  | 'morder_labio'      // 3 (chica)
  | 'boca_abierta'      // 2 no-pieza (chica)
  | 'sacar_lengua'      // 1 de copa/oros (chica)
  | 'ojos_cerrados'     // 12 (negra) o 7 basto/copa (común)

/**
 * Retorna el tipo de seña correspondiente a una carta,
 * o null si la carta no tiene seña asignada.
 */
export function getSeñaCarta(
  valor: Valor,
  palo: Palo,
  esMuestra: boolean,
  esComodin: boolean
): TipoSeña | null {
  // Comodín: señal de la carta más fuerte
  if (esComodin) return 'levantar_cejas'

  // Piezas
  if (esMuestra) {
    if (valor === 2)  return 'levantar_cejas'
    if (valor === 4)  return 'beso'
    if (valor === 5)  return 'arrugar_nariz'
    if (valor === 11) return 'guino_derecho'
    if (valor === 10) return 'guino_izquierdo'
  }

  // Matas
  if (valor === 1 && palo === 'espadas') return 'mueca_derecha'
  if (valor === 1 && palo === 'bastos')  return null             // sin seña
  if (valor === 7 && palo === 'espadas') return 'mueca_izquierda'
  if (valor === 7 && palo === 'oros')    return null             // sin seña

  // Chicas
  if (valor === 3) return 'morder_labio'
  if (valor === 2) return 'boca_abierta'
  if (valor === 1) return 'sacar_lengua'  // copa o oros

  // Negras
  if (valor === 12) return 'ojos_cerrados'

  // 7 basto/copa (comunes)
  if (valor === 7 && (palo === 'bastos' || palo === 'copas')) return 'ojos_cerrados'

  // Sin seña: 11/10 no-pieza, 6, 5, 4
  return null
}
