import type { EstadoJuego, TipoEvento } from './types'

export interface ResultadoValidacion {
  valida: boolean
  razon?: string
}

/**
 * Valida si una acción es legal dado el estado actual del juego.
 * Toda la validación corre en el SERVIDOR — nunca confiar en el cliente.
 */
export function esAccionValida(
  estado: EstadoJuego,
  jugadorId: string,
  accion: TipoEvento
): ResultadoValidacion {
  // Verificar turno
  if (estado.turnoActual !== jugadorId) {
    return { valida: false, razon: 'No es tu turno' }
  }

  // Verificar fase
  switch (accion) {
    case 'JUGAR_CARTA':
      if (!['truco', 'envido', 'flor'].includes(estado.fase)) {
        return { valida: false, razon: 'No se puede jugar carta en esta fase' }
      }
      break

    case 'CANTAR_TRUCO':
      if (estado.truco.estado !== 'sin_cantar') {
        return { valida: false, razon: 'El truco ya fue cantado' }
      }
      break

    case 'CANTAR_RETRUCO':
      if (estado.truco.estado !== 'cantado') {
        return { valida: false, razon: 'Primero debe cantarse Truco' }
      }
      if (estado.truco.ultimoCantador === jugadorId) {
        return { valida: false, razon: 'No podés retrucar tu propio truco' }
      }
      break

    case 'CANTAR_VALE_CUATRO':
      if (estado.truco.estado !== 'retrucado') {
        return { valida: false, razon: 'Primero debe retrucar' }
      }
      if (estado.truco.ultimoCantador === jugadorId) {
        return { valida: false, razon: 'No podés vale-cuatro tu propio retruco' }
      }
      break

    case 'CANTAR_FLOR':
      if (estado.fase !== 'flor') {
        return { valida: false, razon: 'No se canta flor en esta fase' }
      }
      if (!estado.flor.jugadoresConFlor.includes(jugadorId)) {
        return { valida: false, razon: 'No tenés flor' }
      }
      break

    case 'QUIERO':
    case 'NO_QUIERO': {
      const hayAlgoCantado =
        estado.truco.estado === 'cantado' ||
        estado.truco.estado === 'retrucado' ||
        estado.truco.estado === 'vale_cuatro' ||
        estado.envido.estado === 'cantado'
      if (!hayAlgoCantado) {
        return { valida: false, razon: 'No hay nada cantado para responder' }
      }
      break
    }

    case 'IR_AL_MAZO':
      // Siempre se puede ir al mazo en tu turno
      break
  }

  return { valida: true }
}
