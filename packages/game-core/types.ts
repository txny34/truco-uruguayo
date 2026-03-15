// ============================================================
// TIPOS CENTRALES — compartidos entre frontend y backend
// ============================================================

export type Palo = 'espadas' | 'bastos' | 'oros' | 'copas'
export type Valor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12

export interface Carta {
  valor: Valor
  palo: Palo
  esMuestra: boolean    // 2,4,5,10,11 del palo muestra
  esComodin: boolean    // el Rey (12) cuando la muestra descubierta es especial
  oculta?: boolean      // para mostrar carta tapada de oponentes
}

export type DificultadBot = 'facil' | 'medio' | 'dificil'

export interface Jugador {
  id: string
  nombre: string
  avatar?: string
  equipo: 1 | 2
  mano: Carta[]
  listo: boolean
  conectado: boolean
  tieneFlorDeclarada: boolean
  esBot?: boolean
  dificultadBot?: DificultadBot
}

export interface CartaEnMesa {
  jugadorId: string
  carta: Carta
  rondaMano: number     // 1, 2 o 3
}

export type FaseJuego =
  | 'esperando'
  | 'repartiendo'
  | 'flor'
  | 'envido'
  | 'truco'
  | 'fin_mano'
  | 'fin_partida'

export type EstadoCanto =
  | 'sin_cantar'
  | 'cantado'
  | 'retrucado'
  | 'vale_cuatro'
  | 'quiero'
  | 'no_quiero'
  | 'con_flor_quiero'

export interface EstadoTruco {
  estado: EstadoCanto
  ultimoCantador: string | null
  valor: number                   // 2, 3 o 4
}

export interface EstadoEnvido {
  estado: EstadoCanto
  ultimoCantador: string | null
  puntosEnJuego: number          // 2, 3, 4, o falta-envido
}

export interface EstadoFlor {
  jugadoresConFlor: string[]     // playerIds que tienen flor
  estado: EstadoCanto
  resuelta: boolean
}

export interface EstadoJuego {
  salaId: string
  fase: FaseJuego
  turnoActual: string            // playerId
  muestra: Carta | null
  jugadores: Jugador[]
  mesa: CartaEnMesa[]
  truco: EstadoTruco
  envido: EstadoEnvido
  flor: EstadoFlor
  puntaje: { equipo1: number; equipo2: number }
  puntajeMaximo: number          // 15 (mano a mano) o 30 (parejas)
  manoActual: number
  ganadorRonda: number | null    // 1 o 2
  historial: AccionHistorial[]
}

export interface AccionHistorial {
  ronda: number
  jugadorId: string
  tipo: TipoEvento
  dato?: unknown
  timestamp: number
}

// ============================================================
// EVENTOS WEBSOCKET — cliente → servidor
// ============================================================
export type TipoEvento =
  | 'JUGAR_CARTA'
  | 'CANTAR_TRUCO'
  | 'CANTAR_RETRUCO'
  | 'CANTAR_VALE_CUATRO'
  | 'CANTAR_ENVIDO'
  | 'CANTAR_REAL_ENVIDO'
  | 'CANTAR_FALTA_ENVIDO'
  | 'CANTAR_FLOR'
  | 'CANTAR_CON_FLOR_QUIERO'
  | 'QUIERO'
  | 'NO_QUIERO'
  | 'IR_AL_MAZO'
  | 'MOSTRAR_PUNTOS_ENVIDO'

// ============================================================
// ESTADO FILTRADO — lo que ve cada cliente
// ============================================================
export interface JugadorCliente extends Omit<Jugador, 'mano'> {
  mano: Carta[]          // solo tus cartas completas; las de oponentes tienen oculta:true
  cantidadCartas: number
}

export interface EstadoJuegoCliente extends Omit<EstadoJuego, 'jugadores'> {
  jugadores: JugadorCliente[]
  miId: string
}
