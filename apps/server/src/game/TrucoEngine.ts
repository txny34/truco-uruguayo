import type { EstadoJuego, Carta, Jugador, Palo, Valor } from '@truco/game-core'
import { VALORES_MUESTRA, VALOR_ENVIDO_MUESTRA, getRankTruco, getValorEnvido } from '@truco/game-core'

const PALOS: Palo[] = ['espadas', 'bastos', 'oros', 'copas']
const VALORES: Valor[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]

export class TrucoEngine {
  private estado: EstadoJuego

  constructor(salaId: string, jugadores: Pick<Jugador, 'id' | 'nombre' | 'equipo'>[]) {
    this.estado = {
      salaId,
      fase: 'esperando',
      turnoActual: jugadores[0].id,
      muestra: null,
      jugadores: jugadores.map((j) => ({
        ...j,
        avatar: undefined,
        mano: [],
        listo: false,
        conectado: true,
        tieneFlorDeclarada: false,
      })),
      mesa: [],
      truco: { estado: 'sin_cantar', ultimoCantador: null, valor: 2 },
      envido: { estado: 'sin_cantar', ultimoCantador: null, puntosEnJuego: 2 },
      flor: { jugadoresConFlor: [], estado: 'sin_cantar', resuelta: false },
      puntaje: { equipo1: 0, equipo2: 0 },
      puntajeMaximo: 30,
      manoActual: 1,
      ganadorRonda: null,
      historial: [],
    }
  }

  // ────────────────────────────────────────────
  // REPARTIR
  // ────────────────────────────────────────────
  repartir(): EstadoJuego {
    const mazo = this.generarMazo()
    this.shuffleMazo(mazo)

    // La carta en posición 12 (índice) es la muestra
    const cartaMuestra = mazo[12]
    this.estado.muestra = { ...cartaMuestra, esMuestra: false, esComodin: false }

    const palMuestra = cartaMuestra.palo
    const valMuestra = cartaMuestra.valor
    const muestraDescubiertaEsEspecial = VALORES_MUESTRA.includes(valMuestra)

    // Repartir 3 cartas a cada jugador
    let idx = 0
    for (const jugador of this.estado.jugadores) {
      const mano: Carta[] = []
      for (let i = 0; i < 3; i++) {
        // Saltear la posición 12 (la muestra)
        if (idx === 12) idx++
        const raw = mazo[idx++]
        const esMuestra = raw.palo === palMuestra && VALORES_MUESTRA.includes(raw.valor)
        // El Rey del palo muestra es comodín solo si la carta descubierta es especial
        const esComodin =
          raw.valor === 12 && raw.palo === palMuestra && muestraDescubiertaEsEspecial && !esMuestra
        mano.push({ ...raw, esMuestra, esComodin })
      }
      jugador.mano = mano
    }

    // Detectar flores
    this.estado.flor.jugadoresConFlor = []
    for (const jugador of this.estado.jugadores) {
      if (this.tieneFlorEnMano(jugador.mano)) {
        this.estado.flor.jugadoresConFlor.push(jugador.id)
      }
    }

    this.estado.fase =
      this.estado.flor.jugadoresConFlor.length > 0 ? 'flor' : 'envido'

    return this.estado
  }

  // ────────────────────────────────────────────
  // FLOR
  // ────────────────────────────────────────────
  tieneFlorEnMano(mano: Carta[]): boolean {
    const especiales = mano.filter((c) => c.esMuestra || c.esComodin)
    // 2 o más especiales = flor automática
    if (especiales.length >= 2) return true
    const normales = mano.filter((c) => !c.esMuestra && !c.esComodin)
    // 1 especial + 2 normales del mismo palo = flor
    if (especiales.length === 1 && normales.length === 2) {
      return normales[0].palo === normales[1].palo
    }
    // 3 normales del mismo palo = flor
    return normales.length === 3 && normales[0].palo === normales[1].palo && normales[1].palo === normales[2].palo
  }

  // ────────────────────────────────────────────
  // ENVIDO
  // ────────────────────────────────────────────
  calcularEnvido(mano: Carta[]): number {
    const especiales = mano.filter((c) => c.esMuestra || c.esComodin)
    const normales = mano.filter((c) => !c.esMuestra && !c.esComodin)

    let mejor = 0

    // Probar la muestra con cada palo de las cartas normales
    if (especiales.length > 0) {
      const valorEspecial = VALOR_ENVIDO_MUESTRA[especiales[0].valor] ?? 0
      for (const palo of PALOS) {
        const delPalo = normales.filter((c) => c.palo === palo)
        const mejorNormal = delPalo.map((c) => getValorEnvido(c.valor)).sort((a, b) => b - a)[0] ?? 0
        const total = 20 + valorEspecial + mejorNormal
        if (total > mejor) mejor = total
      }
    }

    // Calcular envido sin usar la muestra
    for (const palo of PALOS) {
      const delPalo = normales.filter((c) => c.palo === palo)
      if (delPalo.length >= 2) {
        const vals = delPalo.map((c) => getValorEnvido(c.valor)).sort((a, b) => b - a)
        const total = 20 + vals[0] + vals[1]
        if (total > mejor) mejor = total
      } else if (delPalo.length === 1) {
        const total = getValorEnvido(delPalo[0].valor)
        if (total > mejor) mejor = total
      }
    }

    return mejor
  }

  // ────────────────────────────────────────────
  // TRUCO — comparar cartas en mesa
  // ────────────────────────────────────────────
  evaluarRonda(): { ganador: 1 | 2 | 'empate' } {
    const palMuestra = this.estado.muestra?.palo ?? null
    // Obtener la carta más alta por equipo en esta ronda
    const rankPorEquipo = [0, 0] // índice 0 = equipo1, 1 = equipo2

    for (const cartaEnMesa of this.estado.mesa) {
      const jugador = this.estado.jugadores.find((j) => j.id === cartaEnMesa.jugadorId)!
      const rank = getRankTruco(
        cartaEnMesa.carta.valor,
        cartaEnMesa.carta.palo,
        palMuestra,
        cartaEnMesa.carta.esMuestra,
        cartaEnMesa.carta.esComodin
      )
      const idx = jugador.equipo - 1
      if (rank > rankPorEquipo[idx]) rankPorEquipo[idx] = rank
    }

    if (rankPorEquipo[0] > rankPorEquipo[1]) return { ganador: 1 }
    if (rankPorEquipo[1] > rankPorEquipo[0]) return { ganador: 2 }
    return { ganador: 'empate' }
  }

  getEstado(): EstadoJuego {
    return this.estado
  }

  // ────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ────────────────────────────────────────────
  private generarMazo(): Carta[] {
    const mazo: Carta[] = []
    for (const palo of PALOS) {
      for (const valor of VALORES) {
        mazo.push({ valor, palo, esMuestra: false, esComodin: false })
      }
    }
    return mazo
  }

  private shuffleMazo(mazo: Carta[]): void {
    for (let i = mazo.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[mazo[i], mazo[j]] = [mazo[j], mazo[i]]
    }
  }
}
