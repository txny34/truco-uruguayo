import type { Valor, Palo } from './types'

// Valores que se convierten en MUESTRAS (no incluye 1,3,6,7,12)
export const VALORES_MUESTRA: Valor[] = [2, 4, 5, 10, 11]

// Valor de las muestras para ENVIDO / FLOR
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
 * Orden uruguayo (de mayor a menor):
 * Muestras: 2m > 4m > 5m > 11m > 10m
 * Matas:    1e > 2(no-m) > 1b > 7e > 7o
 * Resto:    3 > rey > caballo > sota > 7(resto) > 6 > 5 > 4
 */
export function getRankTruco(
  valor: Valor,
  palo: Palo,
  palMuestra: Palo | null,
  esMuestra: boolean,
  esComodin: boolean
): number {
  // Comodín tiene el mismo rank que la carta muestra que reemplaza
  if (esComodin) {
    // El rey comodín reemplaza la carta muestra descubierta
    // Si la descubierta era el 4 de oros por ejemplo, el rey vale como 4 muestra
    return 104 // rango del 4 muestra (segunda más alta)
  }

  if (esMuestra) {
    const rankMuestras: Record<number, number> = {
      2: 105, 4: 104, 5: 103, 11: 102, 10: 101,
    }
    return rankMuestras[valor] ?? 100
  }

  // Matas (bravas)
  if (valor === 1 && palo === 'espadas') return 55
  if (valor === 2 && palo !== palMuestra) return 54
  if (valor === 1 && palo === 'bastos') return 53
  if (valor === 7 && palo === 'espadas') return 52
  if (valor === 7 && palo === 'oros') return 51

  // Cartas normales
  const rankNormal: Partial<Record<number, number>> = {
    3: 10,
    12: 7,   // rey normal (no comodín)
    11: 6,   // caballo normal
    10: 5,   // sota normal
    7: 4,
    6: 3,
    5: 2,
    4: 1,
  }
  return rankNormal[valor] ?? 0
}

/**
 * Valor de una carta para el ENVIDO (cartas normales).
 * Figuras (10, 11, 12) valen 0. Resto vale su número.
 */
export function getValorEnvido(valor: Valor): number {
  if ([10, 11, 12].includes(valor)) return 0
  return valor
}
