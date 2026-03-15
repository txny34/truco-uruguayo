import type { EstadoJuego, Carta, DificultadBot, Palo } from '@truco/game-core'
import { getRankTruco, getValorEnvido, VALOR_ENVIDO_MUESTRA } from '@truco/game-core'

export type AccionBot =
  | { tipo: 'JUGAR_CARTA'; carta: Carta }
  | { tipo: 'CANTAR_TRUCO' }
  | { tipo: 'CANTAR_RETRUCO' }
  | { tipo: 'CANTAR_VALE_CUATRO' }
  | { tipo: 'CANTAR_ENVIDO'; subtipo: 'envido' | 'real_envido' | 'falta_envido' }
  | { tipo: 'QUIERO' }
  | { tipo: 'NO_QUIERO' }

const PALOS: Palo[] = ['espadas', 'bastos', 'oros', 'copas']

export class BotStrategy {
  static decidir(estado: EstadoJuego, botId: string, dificultad: DificultadBot): AccionBot {
    // En fase flor siempre jugar carta (avanza al truco, flor no está implementada en engine)
    if (estado.fase === 'flor') {
      return { tipo: 'JUGAR_CARTA', carta: this._cartaDebil(estado, botId) }
    }
    if (dificultad === 'facil') return this._facil(estado, botId)
    if (dificultad === 'medio') return this._medio(estado, botId)
    return this._dificil(estado, botId)
  }

  // ── FÁCIL: siempre NO_QUIERO, siempre la carta más débil ──────────────────
  private static _facil(estado: EstadoJuego, botId: string): AccionBot {
    if (this._trucoPendiente(estado, botId)) return { tipo: 'NO_QUIERO' }
    if (this._envidoPendiente(estado, botId)) return { tipo: 'NO_QUIERO' }
    return { tipo: 'JUGAR_CARTA', carta: this._cartaDebil(estado, botId) }
  }

  // ── MEDIO: lógica básica ───────────────────────────────────────────────────
  private static _medio(estado: EstadoJuego, botId: string): AccionBot {
    const jugador = estado.jugadores.find(j => j.id === botId)!
    const paloMuestra = estado.muestra?.palo ?? null

    if (this._trucoPendiente(estado, botId)) {
      return this._mejorRank(jugador.mano, paloMuestra) >= 52
        ? { tipo: 'QUIERO' }
        : { tipo: 'NO_QUIERO' }
    }
    if (this._envidoPendiente(estado, botId)) {
      return this._calcularEnvido(jugador.mano) >= 27
        ? { tipo: 'QUIERO' }
        : { tipo: 'NO_QUIERO' }
    }

    if (estado.fase === 'envido' && estado.envido.estado === 'sin_cantar') {
      if (this._calcularEnvido(jugador.mano) >= 28)
        return { tipo: 'CANTAR_ENVIDO', subtipo: 'envido' }
    }

    if (estado.fase === 'truco' && estado.truco.estado === 'sin_cantar') {
      if (this._mejorRank(jugador.mano, paloMuestra) >= 51)
        return { tipo: 'CANTAR_TRUCO' }
    }

    return { tipo: 'JUGAR_CARTA', carta: this._cartaOptima(estado, botId) }
  }

  // ── DIFÍCIL: casi imposible ganar ─────────────────────────────────────────
  // Acepta todo, escala agresivo, juega óptimo
  private static _dificil(estado: EstadoJuego, botId: string): AccionBot {
    const jugador = estado.jugadores.find(j => j.id === botId)!
    const paloMuestra = estado.muestra?.palo ?? null
    const rank = this._mejorRank(jugador.mano, paloMuestra)

    if (this._trucoPendiente(estado, botId)) {
      if (estado.truco.estado === 'cantado') {
        if (rank >= 55) return { tipo: 'CANTAR_RETRUCO' }   // tiene mata bruta → escala
        if (rank >= 40) return { tipo: 'QUIERO' }            // tiene algo decente → acepta
        return { tipo: 'NO_QUIERO' }
      }
      if (estado.truco.estado === 'retrucado') {
        if (rank >= 55) return { tipo: 'CANTAR_VALE_CUATRO' }
        if (rank >= 51) return { tipo: 'QUIERO' }
        return { tipo: 'NO_QUIERO' }
      }
      // vale_cuatro
      return rank >= 52 ? { tipo: 'QUIERO' } : { tipo: 'NO_QUIERO' }
    }

    if (this._envidoPendiente(estado, botId)) {
      return this._calcularEnvido(jugador.mano) >= 25
        ? { tipo: 'QUIERO' }
        : { tipo: 'NO_QUIERO' }
    }

    if (estado.fase === 'envido' && estado.envido.estado === 'sin_cantar') {
      const env = this._calcularEnvido(jugador.mano)
      if (env >= 30) return { tipo: 'CANTAR_ENVIDO', subtipo: 'falta_envido' }
      if (env >= 28) return { tipo: 'CANTAR_ENVIDO', subtipo: 'real_envido' }
      if (env >= 22) return { tipo: 'CANTAR_ENVIDO', subtipo: 'envido' }
    }

    if (estado.fase === 'truco' && estado.truco.estado === 'sin_cantar') {
      if (rank >= 10) return { tipo: 'CANTAR_TRUCO' }  // canta con cualquier carta decente
    }

    return { tipo: 'JUGAR_CARTA', carta: this._cartaOptima(estado, botId) }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private static _trucoPendiente(estado: EstadoJuego, botId: string): boolean {
    return (
      ['cantado', 'retrucado', 'vale_cuatro'].includes(estado.truco.estado) &&
      estado.truco.ultimoCantador !== botId
    )
  }

  private static _envidoPendiente(estado: EstadoJuego, botId: string): boolean {
    return estado.envido.estado === 'cantado' && estado.envido.ultimoCantador !== botId
  }

  private static _mejorRank(mano: Carta[], paloMuestra: string | null): number {
    if (mano.length === 0) return 0
    return Math.max(
      ...mano.map(c =>
        getRankTruco(c.valor, c.palo, paloMuestra as any, c.esMuestra, c.esComodin)
      )
    )
  }

  private static _cartaDebil(estado: EstadoJuego, botId: string): Carta {
    const jugador = estado.jugadores.find(j => j.id === botId)!
    const paloMuestra = estado.muestra?.palo ?? null
    return [...jugador.mano].sort(
      (a, b) =>
        getRankTruco(a.valor, a.palo, paloMuestra as any, a.esMuestra, a.esComodin) -
        getRankTruco(b.valor, b.palo, paloMuestra as any, b.esMuestra, b.esComodin)
    )[0]
  }

  private static _cartaOptima(estado: EstadoJuego, botId: string): Carta {
    const jugador = estado.jugadores.find(j => j.id === botId)!
    const paloMuestra = estado.muestra?.palo ?? null

    const mejorRivaEnMesa = Math.max(
      0,
      ...estado.mesa
        .filter(c => c.jugadorId !== botId)
        .map(c =>
          getRankTruco(
            c.carta.valor, c.carta.palo, paloMuestra as any,
            c.carta.esMuestra, c.carta.esComodin
          )
        )
    )

    // La carta más baja que gane la baza
    const ganadoras = [...jugador.mano]
      .filter(
        c =>
          getRankTruco(c.valor, c.palo, paloMuestra as any, c.esMuestra, c.esComodin) >
          mejorRivaEnMesa
      )
      .sort(
        (a, b) =>
          getRankTruco(a.valor, a.palo, paloMuestra as any, a.esMuestra, a.esComodin) -
          getRankTruco(b.valor, b.palo, paloMuestra as any, b.esMuestra, b.esComodin)
      )
    if (ganadoras.length > 0) return ganadoras[0]

    return this._cartaDebil(estado, botId)
  }

  private static _calcularEnvido(mano: Carta[]): number {
    const especiales = mano.filter(c => c.esMuestra || c.esComodin)
    const normales = mano.filter(c => !c.esMuestra && !c.esComodin)
    let mejor = 0

    if (especiales.length > 0) {
      const valorEspecial = VALOR_ENVIDO_MUESTRA[especiales[0].valor] ?? 0
      for (const palo of PALOS) {
        const delPalo = normales.filter(c => c.palo === palo)
        const mejorNormal =
          delPalo.map(c => getValorEnvido(c.valor)).sort((a, b) => b - a)[0] ?? 0
        const total = 20 + valorEspecial + mejorNormal
        if (total > mejor) mejor = total
      }
    }

    for (const palo of PALOS) {
      const delPalo = normales.filter(c => c.palo === palo)
      if (delPalo.length >= 2) {
        const vals = delPalo.map(c => getValorEnvido(c.valor)).sort((a, b) => b - a)
        const total = 20 + vals[0] + vals[1]
        if (total > mejor) mejor = total
      } else if (delPalo.length === 1) {
        const val = getValorEnvido(delPalo[0].valor)
        if (val > mejor) mejor = val
      }
    }

    return mejor
  }
}
