import type { Server } from 'socket.io'
import type { EstadoJuego, DificultadBot } from '@truco/game-core'
import { getRankTruco, getSeñaCarta } from '@truco/game-core'
import { RoomManager } from './RoomManager'
import { BotStrategy } from './BotStrategy'

type EmitirFn = (io: Server, salaId: string, estado: EstadoJuego) => void

const DELAY_MS: Record<DificultadBot, number> = {
  facil: 600,
  medio: 900,
  dificil: 1300,
}

// Probabilidad de que el bot señe antes de jugar carta
const TASA_SEÑA: Record<DificultadBot, number> = {
  facil:   0,
  medio:   0.45,
  dificil: 0.65,
}

export class BotRunner {
  static scheduleIfBot(io: Server, salaId: string, emitir: EmitirFn): void {
    const estado = RoomManager.getEstado(salaId)
    if (!estado) return
    if (estado.fase === 'fin_mano' || estado.fase === 'fin_partida') return

    const dificultad = RoomManager.getDificultadBot(salaId, estado.turnoActual)
    if (!dificultad) return

    const botId = estado.turnoActual
    setTimeout(() => {
      BotRunner._ejecutar(io, salaId, botId, dificultad, emitir, 0)
    }, DELAY_MS[dificultad])
  }

  private static _ejecutar(
    io: Server,
    salaId: string,
    botId: string,
    dificultad: DificultadBot,
    emitir: EmitirFn,
    depth: number
  ): void {
    if (depth > 8) return

    const sala = RoomManager.getSala(salaId)
    if (!sala) return

    const estado = RoomManager.getEstado(salaId)
    if (!estado) return
    if (estado.fase === 'fin_mano' || estado.fase === 'fin_partida') return
    if (estado.turnoActual !== botId) return

    const engine = RoomManager.getEngine(salaId)
    if (!engine) return

    const accion = BotStrategy.decidir(estado, botId, dificultad)

    // El bot seña a su compañero humano antes de jugar carta
    if (accion.tipo === 'JUGAR_CARTA') {
      BotRunner._emitirSeñaBot(io, estado, botId, dificultad)
    }

    let nuevoEstado: EstadoJuego

    switch (accion.tipo) {
      case 'JUGAR_CARTA':
        nuevoEstado = engine.jugarCarta(botId, accion.carta)
        break
      case 'CANTAR_TRUCO':
        nuevoEstado = engine.cantarTruco(botId)
        break
      case 'CANTAR_RETRUCO':
        nuevoEstado = engine.cantarRetruco(botId)
        break
      case 'CANTAR_VALE_CUATRO':
        nuevoEstado = engine.cantarValeCuatro(botId)
        break
      case 'CANTAR_ENVIDO':
        nuevoEstado = engine.cantarEnvido(botId, accion.subtipo)
        break
      case 'QUIERO':
        nuevoEstado = engine.quiero(botId)
        break
      case 'NO_QUIERO':
        nuevoEstado = engine.noQuiero(botId)
        break
      default:
        return
    }

    emitir(io, salaId, nuevoEstado)

    if (nuevoEstado.fase === 'fin_mano' || nuevoEstado.fase === 'fin_partida') return

    const nextDificultad = RoomManager.getDificultadBot(salaId, nuevoEstado.turnoActual)
    if (!nextDificultad) return

    const nextBotId = nuevoEstado.turnoActual
    const delay = nextBotId === botId ? 400 : DELAY_MS[nextDificultad]
    setTimeout(() => {
      BotRunner._ejecutar(io, salaId, nextBotId, nextDificultad, emitir, depth + 1)
    }, delay)
  }

  /**
   * El bot opcionalmente emite una seña a su compañero humano
   * basada en su carta más fuerte.
   */
  private static _emitirSeñaBot(
    io: Server,
    estado: EstadoJuego,
    botId: string,
    dificultad: DificultadBot
  ): void {
    if (Math.random() > TASA_SEÑA[dificultad]) return

    const bot = estado.jugadores.find(j => j.id === botId)
    if (!bot || bot.mano.length === 0) return

    // Compañero humano en el mismo equipo
    const companero = estado.jugadores.find(
      j => j.equipo === bot.equipo && j.id !== botId && !j.esBot
    )
    if (!companero) return

    const socketCompanero = io.sockets.sockets.get(companero.id)
    if (!socketCompanero) return

    // Seña de la carta más fuerte del bot
    const palMuestra = estado.muestra?.palo ?? null
    const valMuestra = estado.muestra?.valor ?? null
    const mejorCarta = [...bot.mano].sort((a, b) =>
      getRankTruco(b.valor, b.palo, palMuestra as any, b.esMuestra, b.esComodin, valMuestra as any) -
      getRankTruco(a.valor, a.palo, palMuestra as any, a.esMuestra, a.esComodin, valMuestra as any)
    )[0]

    const tipoSeña = getSeñaCarta(mejorCarta.valor, mejorCarta.palo, mejorCarta.esMuestra, mejorCarta.esComodin)
    if (!tipoSeña) return

    socketCompanero.emit('SEÑA_RECIBIDA', {
      de: botId,
      nombre: bot.nombre,
      tipo: tipoSeña,
    })
  }
}
