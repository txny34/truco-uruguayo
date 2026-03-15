// ============================================================
// MATCHMAKING + ELO — en memoria (reemplazar con Redis/DB en prod)
// ============================================================

const K_FACTOR = 32
const ELO_INICIAL = 1000

interface DatosElo {
  nombre: string
  elo: number
  victorias: number
  derrotas: number
  partidasJugadas: number
}

interface EntradaCola {
  socketId: string
  nombre: string
  elo: number
  entroEn: number
}

// socketId → datos ELO
const eloStore = new Map<string, DatosElo>()

// Cola de matchmaking
const cola: EntradaCola[] = []

function esperado(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
}

export class MatchmakingManager {
  // ── ELO ────────────────────────────────────────────────────

  static getOCrear(socketId: string, nombre: string): DatosElo {
    if (!eloStore.has(socketId)) {
      eloStore.set(socketId, {
        nombre,
        elo: ELO_INICIAL,
        victorias: 0,
        derrotas: 0,
        partidasJugadas: 0,
      })
    }
    return eloStore.get(socketId)!
  }

  static getElo(socketId: string): number {
    return eloStore.get(socketId)?.elo ?? ELO_INICIAL
  }

  /**
   * Actualiza ELO al terminar una partida.
   * ganadores / perdedores: lista de socketIds
   */
  static actualizarEloPartida(
    ganadores: { socketId: string; nombre: string }[],
    perdedores: { socketId: string; nombre: string }[]
  ): {
    ganadores: { socketId: string; nombre: string; eloAntes: number; eloNuevo: number; delta: number }[]
    perdedores: { socketId: string; nombre: string; eloAntes: number; eloNuevo: number; delta: number }[]
  } {
    // Asegurarse de que todos tienen registro
    for (const j of [...ganadores, ...perdedores]) {
      this.getOCrear(j.socketId, j.nombre)
    }

    const eloPromedioGanadores =
      ganadores.reduce((acc, g) => acc + this.getElo(g.socketId), 0) / ganadores.length
    const eloPromedioPerdedores =
      perdedores.reduce((acc, p) => acc + this.getElo(p.socketId), 0) / perdedores.length

    const resultadoGanadores: ReturnType<typeof this.actualizarEloPartida>['ganadores'] = []
    const resultadoPerdedores: ReturnType<typeof this.actualizarEloPartida>['perdedores'] = []

    for (const g of ganadores) {
      const datos = eloStore.get(g.socketId)!
      const eloAntes = datos.elo
      const e = esperado(eloAntes, eloPromedioPerdedores)
      const delta = Math.round(K_FACTOR * (1 - e))
      datos.elo = Math.max(100, eloAntes + delta)
      datos.victorias++
      datos.partidasJugadas++
      resultadoGanadores.push({ socketId: g.socketId, nombre: g.nombre, eloAntes, eloNuevo: datos.elo, delta })
    }

    for (const p of perdedores) {
      const datos = eloStore.get(p.socketId)!
      const eloAntes = datos.elo
      const e = esperado(eloAntes, eloPromedioGanadores)
      const delta = Math.round(K_FACTOR * (0 - e))
      datos.elo = Math.max(100, eloAntes + delta)
      datos.derrotas++
      datos.partidasJugadas++
      resultadoPerdedores.push({ socketId: p.socketId, nombre: p.nombre, eloAntes, eloNuevo: datos.elo, delta })
    }

    return { ganadores: resultadoGanadores, perdedores: resultadoPerdedores }
  }

  static getRanking(limit = 20): DatosElo[] {
    return [...eloStore.values()]
      .filter((d) => d.partidasJugadas > 0)
      .sort((a, b) => b.elo - a.elo)
      .slice(0, limit)
  }

  // ── COLA DE MATCHMAKING ────────────────────────────────────

  static entrar(socketId: string, nombre: string): void {
    if (cola.find((e) => e.socketId === socketId)) return
    const elo = this.getOCrear(socketId, nombre).elo
    cola.push({ socketId, nombre, elo, entroEn: Date.now() })
  }

  static salir(socketId: string): void {
    const idx = cola.findIndex((e) => e.socketId === socketId)
    if (idx !== -1) cola.splice(idx, 1)
  }

  static estaCola(socketId: string): boolean {
    return cola.some((e) => e.socketId === socketId)
  }

  static posicion(socketId: string): number {
    return cola.findIndex((e) => e.socketId === socketId) + 1
  }

  /**
   * Intenta matchear dos jugadores de la cola.
   * Empareja al que lleva más tiempo esperando con el de ELO más cercano.
   * Devuelve el par [primero_entro, segundo_entro] o null.
   */
  static intentarMatchear(): [EntradaCola, EntradaCola] | null {
    if (cola.length < 2) return null

    // El primero que entró es el ancla
    const ancla = cola[0]
    let mejorIdx = 1
    let menorDif = Math.abs(ancla.elo - cola[1].elo)

    for (let i = 2; i < cola.length; i++) {
      const dif = Math.abs(ancla.elo - cola[i].elo)
      // Tiempo esperando > 30s: acepta cualquier rival
      const esperando = (Date.now() - ancla.entroEn) / 1000
      if (dif < menorDif || esperando > 30) {
        menorDif = dif
        mejorIdx = i
      }
    }

    const rival = cola[mejorIdx]
    // Remover ambos de la cola
    cola.splice(mejorIdx, 1)
    cola.splice(0, 1)

    return [ancla, rival]
  }
}
