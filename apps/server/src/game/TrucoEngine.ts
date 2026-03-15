import type { EstadoJuego, Carta, Jugador, Palo, Valor } from '@truco/game-core'
import { VALORES_MUESTRA, VALOR_ENVIDO_MUESTRA, getRankTruco, getValorEnvido } from '@truco/game-core'

const PALOS: Palo[] = ['espadas', 'bastos', 'oros', 'copas']
const VALORES: Valor[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]

export class TrucoEngine {
  private estado: EstadoJuego

  // Tracking de bazas (privado, no va al cliente)
  private bazaActual: number = 1
  private resultadosBazas: { baza: number; ganador: 1 | 2 | 'empate' }[] = []
  private turnoAntesCanto: string | null = null

  constructor(salaId: string, jugadores: Pick<Jugador, 'id' | 'nombre' | 'equipo' | 'esBot' | 'dificultadBot'>[]) {
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
      puntajeMaximo: 40,
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

    const cartaMuestra = mazo[12]
    this.estado.muestra = { ...cartaMuestra, esMuestra: false, esComodin: false }

    const palMuestra = cartaMuestra.palo
    const valMuestra = cartaMuestra.valor
    const muestraEsEspecial = VALORES_MUESTRA.includes(valMuestra)

    let idx = 0
    for (const jugador of this.estado.jugadores) {
      const mano: Carta[] = []
      for (let i = 0; i < 3; i++) {
        if (idx === 12) idx++
        const raw = mazo[idx++]
        const esMuestra = raw.palo === palMuestra && VALORES_MUESTRA.includes(raw.valor)
        const esComodin =
          raw.valor === 12 && raw.palo === palMuestra && muestraEsEspecial && !esMuestra
        mano.push({ ...raw, esMuestra, esComodin })
      }
      jugador.mano = mano
    }

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
  // JUGAR CARTA — núcleo del loop de juego
  // ────────────────────────────────────────────
  jugarCarta(jugadorId: string, carta: Carta): EstadoJuego {
    const jugador = this.estado.jugadores.find((j) => j.id === jugadorId)
    if (!jugador) return this.estado

    const idx = jugador.mano.findIndex(
      (c) => c.valor === carta.valor && c.palo === carta.palo
    )
    if (idx === -1) return this.estado
    const cartaJugada = jugador.mano.splice(idx, 1)[0]

    // Jugar carta en envido/flor = saltar esas fases y pasar a truco
    if (this.estado.fase === 'flor' || this.estado.fase === 'envido') {
      this.estado.fase = 'truco'
    }

    this.estado.mesa.push({ jugadorId, carta: cartaJugada, rondaMano: this.bazaActual })

    this.estado.historial.push({
      ronda: this.estado.manoActual,
      jugadorId,
      tipo: 'JUGAR_CARTA',
      dato: carta,
      timestamp: Date.now(),
    })

    const enBazaActual = this.estado.mesa.filter((c) => c.rondaMano === this.bazaActual)
    if (enBazaActual.length === this.estado.jugadores.length) {
      this._evaluarBazaCompleta()
    } else {
      this._avanzarTurno()
    }

    return this.estado
  }

  // ────────────────────────────────────────────
  // CANTOS DE TRUCO
  // ────────────────────────────────────────────
  cantarTruco(jugadorId: string): EstadoJuego {
    this.turnoAntesCanto = this.estado.turnoActual
    this.estado.truco.estado = 'cantado'
    this.estado.truco.ultimoCantador = jugadorId
    this._avanzarTurno()
    return this.estado
  }

  cantarRetruco(jugadorId: string): EstadoJuego {
    this.turnoAntesCanto = this.estado.turnoActual
    this.estado.truco.estado = 'retrucado'
    this.estado.truco.ultimoCantador = jugadorId
    this._avanzarTurno()
    return this.estado
  }

  cantarValeCuatro(jugadorId: string): EstadoJuego {
    this.turnoAntesCanto = this.estado.turnoActual
    this.estado.truco.estado = 'vale_cuatro'
    this.estado.truco.ultimoCantador = jugadorId
    this._avanzarTurno()
    return this.estado
  }

  // ────────────────────────────────────────────
  // CANTAR ENVIDO
  // ────────────────────────────────────────────
  cantarEnvido(jugadorId: string, tipo: string): EstadoJuego {
    this.turnoAntesCanto = this.estado.turnoActual
    this.estado.envido.estado = 'cantado'
    this.estado.envido.ultimoCantador = jugadorId
    if (tipo === 'real_envido') this.estado.envido.puntosEnJuego = 3
    else if (tipo === 'falta_envido') this.estado.envido.puntosEnJuego = this.estado.puntajeMaximo
    else this.estado.envido.puntosEnJuego = 2
    this._avanzarTurno()
    return this.estado
  }

  // ────────────────────────────────────────────
  // QUIERO
  // ────────────────────────────────────────────
  quiero(jugadorId: string): EstadoJuego {
    const trucoPendiente = ['cantado', 'retrucado', 'vale_cuatro'].includes(
      this.estado.truco.estado
    )
    const envidoPendiente = this.estado.envido.estado === 'cantado'

    if (trucoPendiente) {
      if (this.estado.truco.estado === 'cantado')     this.estado.truco.valor = 2
      else if (this.estado.truco.estado === 'retrucado')  this.estado.truco.valor = 3
      else if (this.estado.truco.estado === 'vale_cuatro') this.estado.truco.valor = 4
      this.estado.truco.estado = 'quiero'
      // Devolver turno al cantador para que siga jugando
      if (this.turnoAntesCanto) {
        this.estado.turnoActual = this.turnoAntesCanto
        this.turnoAntesCanto = null
      }
    } else if (envidoPendiente) {
      this._resolverEnvidoQuiero()
    }

    return this.estado
  }

  // ────────────────────────────────────────────
  // NO QUIERO
  // ────────────────────────────────────────────
  noQuiero(jugadorId: string): EstadoJuego {
    const trucoPendiente = ['cantado', 'retrucado', 'vale_cuatro'].includes(
      this.estado.truco.estado
    )
    const envidoPendiente = this.estado.envido.estado === 'cantado'

    if (trucoPendiente) {
      // El cantador gana los puntos de la instancia anterior aceptada:
      //   truco no_querido  → 1 pt  (nada estaba acordado)
      //   retruco no_querido → 2 pts (truco estaba acordado)
      //   vale_cuatro no_querido → 3 pts (retruco estaba acordado)
      const ptsNoQuiero =
        this.estado.truco.estado === 'cantado'    ? 1 :
        this.estado.truco.estado === 'retrucado'  ? 2 : 3
      const cantadorId = this.estado.truco.ultimoCantador!
      const cantador = this.estado.jugadores.find((j) => j.id === cantadorId)!
      this._sumarPuntos(cantador.equipo, ptsNoQuiero)
      this.estado.truco.estado = 'no_quiero'
      this.estado.ganadorRonda = cantador.equipo
      this._finManoOPartida()
    } else if (envidoPendiente) {
      // Cantador de envido gana 1 punto
      const cantadorId = this.estado.envido.ultimoCantador!
      const cantador = this.estado.jugadores.find((j) => j.id === cantadorId)!
      this._sumarPuntos(cantador.equipo, 1)
      this.estado.envido.estado = 'no_quiero'
      this.estado.fase = 'truco'
      if (this.turnoAntesCanto) {
        this.estado.turnoActual = this.turnoAntesCanto
        this.turnoAntesCanto = null
      }
    }

    return this.estado
  }

  // ────────────────────────────────────────────
  // IR AL MAZO
  // ────────────────────────────────────────────
  irAlMazo(jugadorId: string): EstadoJuego {
    const yo = this.estado.jugadores.find((j) => j.id === jugadorId)!
    const oponente = this.estado.jugadores.find((j) => j.id !== jugadorId)!
    this._sumarPuntos(oponente.equipo, this.estado.truco.valor)
    this.estado.ganadorRonda = oponente.equipo
    this._finManoOPartida()
    return this.estado
  }

  // ────────────────────────────────────────────
  // SIGUIENTE MANO
  // ────────────────────────────────────────────
  siguienteMano(): EstadoJuego {
    // El turno inicial rota al siguiente jugador (el que fue "pie" ahora es "mano")
    const jugadores = this.estado.jugadores
    const idxActual = jugadores.findIndex((j) => j.id === this.estado.turnoActual)
    const primerTurno = jugadores[(idxActual + 1) % jugadores.length].id

    this.bazaActual = 1
    this.resultadosBazas = []
    this.turnoAntesCanto = null
    this.estado.manoActual++
    this.estado.ganadorRonda = null
    this.estado.mesa = []
    this.estado.turnoActual = primerTurno
    this.estado.truco = { estado: 'sin_cantar', ultimoCantador: null, valor: 2 }
    this.estado.envido = { estado: 'sin_cantar', ultimoCantador: null, puntosEnJuego: 2 }
    this.estado.flor = { jugadoresConFlor: [], estado: 'sin_cantar', resuelta: false }

    return this.repartir()
  }

  // ────────────────────────────────────────────
  // FLOR
  // ────────────────────────────────────────────
  tieneFlorEnMano(mano: Carta[]): boolean {
    const especiales = mano.filter((c) => c.esMuestra || c.esComodin)
    if (especiales.length >= 2) return true
    const normales = mano.filter((c) => !c.esMuestra && !c.esComodin)
    if (especiales.length === 1 && normales.length === 2) {
      return normales[0].palo === normales[1].palo
    }
    return (
      normales.length === 3 &&
      normales[0].palo === normales[1].palo &&
      normales[1].palo === normales[2].palo
    )
  }

  // ────────────────────────────────────────────
  // ENVIDO
  // ────────────────────────────────────────────
  calcularEnvido(mano: Carta[]): number {
    const especiales = mano.filter((c) => c.esMuestra || c.esComodin)
    const normales = mano.filter((c) => !c.esMuestra && !c.esComodin)

    let mejor = 0

    if (especiales.length > 0) {
      const valorEspecial = VALOR_ENVIDO_MUESTRA[especiales[0].valor] ?? 0
      for (const palo of PALOS) {
        const delPalo = normales.filter((c) => c.palo === palo)
        const mejorNormal =
          delPalo.map((c) => getValorEnvido(c.valor)).sort((a, b) => b - a)[0] ?? 0
        const total = 20 + valorEspecial + mejorNormal
        if (total > mejor) mejor = total
      }
    }

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
    const valMuestra = this.estado.muestra?.valor ?? null
    const rankPorEquipo = [0, 0]

    for (const cartaEnMesa of this.estado.mesa) {
      const jugador = this.estado.jugadores.find((j) => j.id === cartaEnMesa.jugadorId)!
      const rank = getRankTruco(
        cartaEnMesa.carta.valor,
        cartaEnMesa.carta.palo,
        palMuestra,
        cartaEnMesa.carta.esMuestra,
        cartaEnMesa.carta.esComodin,
        valMuestra
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
  private _evaluarBazaCompleta(): void {
    const resultado = this.evaluarRonda()
    // Guardar quién fue primero en esta baza (para regla del empate)
    const primeraCartaBaza = this.estado.mesa.find((c) => c.rondaMano === this.bazaActual)

    this.resultadosBazas.push({ baza: this.bazaActual, ganador: resultado.ganador })

    const ganadorMano = this._calcularGanadorMano()

    if (ganadorMano !== null) {
      this._resolverMano(ganadorMano)
    } else {
      // Preparar siguiente baza
      this.bazaActual++
      this.estado.mesa = []

      if (resultado.ganador !== 'empate') {
        // Ganador de la baza va primero
        const ganadorJugador = this.estado.jugadores.find(
          (j) => j.equipo === resultado.ganador
        )
        if (ganadorJugador) this.estado.turnoActual = ganadorJugador.id
      } else if (primeraCartaBaza) {
        // Empate: el "mano" (primero de la baza) repite
        this.estado.turnoActual = primeraCartaBaza.jugadorId
      }
    }
  }

  private _calcularGanadorMano(): 1 | 2 | null {
    const bazas = this.resultadosBazas
    const wins: Record<number, number> = { 1: 0, 2: 0 }
    for (const b of bazas) {
      if (b.ganador !== 'empate') wins[b.ganador]++
    }

    // Alguien tiene 2 victorias → gana la mano
    if (wins[1] >= 2) return 1
    if (wins[2] >= 2) return 2

    if (bazas.length >= 2) {
      // 1-0 con empates → el que ganó 1 baza gana la mano
      if (wins[1] === 1 && wins[2] === 0) return 1
      if (wins[2] === 1 && wins[1] === 0) return 2
      // 1-1 → necesitamos la 3ra baza
    }

    if (bazas.length === 3) {
      if (wins[1] > wins[2]) return 1
      if (wins[2] > wins[1]) return 2
      // Todo empate → gana quien ganó la 1ra baza (o equipo 1 si todo empató)
      const firstWin = bazas.find((b) => b.ganador !== 'empate')
      return firstWin ? (firstWin.ganador as 1 | 2) : 1
    }

    return null
  }

  private _resolverMano(ganador: 1 | 2): void {
    this._sumarPuntos(ganador, this.estado.truco.valor)
    this.estado.ganadorRonda = ganador
    this._finManoOPartida()
  }

  private _resolverEnvidoQuiero(): void {
    const envidos = this.estado.jugadores.map((j) => ({
      equipo: j.equipo,
      puntos: this.calcularEnvido(j.mano),
    }))
    const mejor = envidos.sort((a, b) => b.puntos - a.puntos)[0]
    this._sumarPuntos(mejor.equipo, this.estado.envido.puntosEnJuego)
    this.estado.envido.estado = 'quiero'
    this.estado.fase = 'truco'
    if (this.turnoAntesCanto) {
      this.estado.turnoActual = this.turnoAntesCanto
      this.turnoAntesCanto = null
    }
  }

  private _finManoOPartida(): void {
    const max = this.estado.puntajeMaximo
    if (
      this.estado.puntaje.equipo1 >= max ||
      this.estado.puntaje.equipo2 >= max
    ) {
      this.estado.fase = 'fin_partida'
    } else {
      this.estado.fase = 'fin_mano'
    }
  }

  private _sumarPuntos(equipo: number, puntos: number): void {
    if (equipo === 1) this.estado.puntaje.equipo1 += puntos
    else this.estado.puntaje.equipo2 += puntos
  }

  private _avanzarTurno(): void {
    const jugadores = this.estado.jugadores
    const idx = jugadores.findIndex((j) => j.id === this.estado.turnoActual)
    this.estado.turnoActual = jugadores[(idx + 1) % jugadores.length].id
  }

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
