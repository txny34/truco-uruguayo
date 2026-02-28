import { TrucoEngine } from './TrucoEngine'
import type { Jugador, EstadoJuego } from '@truco/game-core'

interface Sala {
  id: string
  engine: TrucoEngine
  tipo: 'publica' | 'privada'
  jugadoresEsperando: string[]  // socketIds que aún no están listos
  creadaEn: number
}

// En producción: reemplazar por Redis
const salas = new Map<string, Sala>()
// Mapeo socketId → salaId para desconexiones
const socketSala = new Map<string, string>()

export class RoomManager {
  static crearSala(tipo: 'publica' | 'privada' = 'privada'): string {
    const salaId = Math.random().toString(36).substring(2, 8).toUpperCase()
    salas.set(salaId, {
      id: salaId,
      engine: null as any, // se inicializa cuando hay suficientes jugadores
      tipo,
      jugadoresEsperando: [],
      creadaEn: Date.now(),
    })
    return salaId
  }

  static agregarJugador(salaId: string, socketId: string): boolean {
    const sala = salas.get(salaId)
    if (!sala) return false
    if (!sala.jugadoresEsperando.includes(socketId)) {
      sala.jugadoresEsperando.push(socketId)
    }
    socketSala.set(socketId, salaId)
    return true
  }

  static iniciarPartida(
    salaId: string,
    jugadores: Pick<Jugador, 'id' | 'nombre' | 'equipo'>[]
  ): boolean {
    const sala = salas.get(salaId)
    if (!sala) return false
    sala.engine = new TrucoEngine(salaId, jugadores)
    return true
  }

  static getSala(salaId: string): Sala | undefined {
    return salas.get(salaId)
  }

  static getEstado(salaId: string): EstadoJuego | null {
    return salas.get(salaId)?.engine?.getEstado() ?? null
  }

  static getEngine(salaId: string): TrucoEngine | null {
    return salas.get(salaId)?.engine ?? null
  }

  static getSalaDe(socketId: string): string | undefined {
    return socketSala.get(socketId)
  }

  static removerJugador(socketId: string): string | null {
    const salaId = socketSala.get(socketId)
    if (!salaId) return null
    const sala = salas.get(salaId)
    if (sala) {
      sala.jugadoresEsperando = sala.jugadoresEsperando.filter((id) => id !== socketId)
    }
    socketSala.delete(socketId)
    return salaId
  }

  static eliminarSala(salaId: string): void {
    salas.delete(salaId)
  }
}
