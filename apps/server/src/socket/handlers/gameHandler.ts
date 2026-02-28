import type { Server, Socket } from 'socket.io'
import { RoomManager } from '../../game/RoomManager'
import { esAccionValida } from '@truco/game-core'
import type { EstadoJuegoCliente, JugadorCliente } from '@truco/game-core'

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`🟢 Conectado: ${socket.id}`)

    // ── LOBBY ──────────────────────────────────
    socket.on('CREAR_SALA', ({ nombre, equipo }) => {
      const salaId = RoomManager.crearSala('privada')
      RoomManager.agregarJugador(salaId, socket.id)
      socket.join(salaId)
      socket.data = { salaId, jugadorId: socket.id, nombre, equipo }
      socket.emit('SALA_CREADA', { salaId })
    })

    socket.on('UNIRSE_SALA', ({ salaId, nombre, equipo }) => {
      const ok = RoomManager.agregarJugador(salaId, socket.id)
      if (!ok) {
        socket.emit('ERROR', { mensaje: `Sala ${salaId} no existe` })
        return
      }
      socket.join(salaId)
      socket.data = { salaId, jugadorId: socket.id, nombre, equipo }
      io.to(salaId).emit('JUGADOR_UNIDO', { jugadorId: socket.id, nombre, equipo })
    })

    // ── INICIO DE PARTIDA ──────────────────────
    socket.on('INICIAR_PARTIDA', ({ jugadores }) => {
      const { salaId } = socket.data
      const ok = RoomManager.iniciarPartida(salaId, jugadores)
      if (!ok) return

      const engine = RoomManager.getEngine(salaId)!
      const estado = engine.repartir()

      // Enviar a cada jugador solo SUS cartas
      for (const jugador of estado.jugadores) {
        const s = io.sockets.sockets.get(jugador.id)
        if (s) {
          s.emit('PARTIDA_INICIADA', filtrarEstado(estado, jugador.id))
        }
      }
    })

    // ── JUGAR CARTA ────────────────────────────
    socket.on('JUGAR_CARTA', ({ carta }) => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'JUGAR_CARTA')
      if (!validacion.valida) {
        socket.emit('ERROR_ACCION', { razon: validacion.razon })
        return
      }

      // Emitir a todos que se jugó la carta
      io.to(salaId).emit('CARTA_JUGADA', { jugadorId, carta })

      // TODO: actualizar estado en engine y evaluar ronda
    })

    // ── CANTOS ────────────────────────────────
    socket.on('CANTAR_TRUCO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'CANTAR_TRUCO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      io.to(salaId).emit('TRUCO_CANTADO', { jugadorId, nombre: socket.data.nombre })
    })

    socket.on('CANTAR_RETRUCO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'CANTAR_RETRUCO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      io.to(salaId).emit('RETRUCO_CANTADO', { jugadorId, nombre: socket.data.nombre })
    })

    socket.on('CANTAR_ENVIDO', ({ tipo }) => {
      const { salaId, jugadorId } = socket.data
      io.to(salaId).emit('ENVIDO_CANTADO', { jugadorId, tipo, nombre: socket.data.nombre })
    })

    socket.on('CANTAR_FLOR', () => {
      const { salaId, jugadorId } = socket.data
      io.to(salaId).emit('FLOR_CANTADA', { jugadorId, nombre: socket.data.nombre })
    })

    socket.on('QUIERO', () => {
      const { salaId, jugadorId } = socket.data
      io.to(salaId).emit('RESPUESTA', { jugadorId, respuesta: 'quiero', nombre: socket.data.nombre })
    })

    socket.on('NO_QUIERO', () => {
      const { salaId, jugadorId } = socket.data
      io.to(salaId).emit('RESPUESTA', { jugadorId, respuesta: 'no_quiero', nombre: socket.data.nombre })
    })

    socket.on('IR_AL_MAZO', () => {
      const { salaId, jugadorId } = socket.data
      io.to(salaId).emit('JUGADOR_AL_MAZO', { jugadorId, nombre: socket.data.nombre })
    })

    // ── DESCONEXIÓN ───────────────────────────
    socket.on('disconnect', () => {
      const salaId = RoomManager.removerJugador(socket.id)
      if (salaId) {
        io.to(salaId).emit('JUGADOR_DESCONECTADO', {
          jugadorId: socket.id,
          nombre: socket.data?.nombre,
        })
      }
      console.log(`🔴 Desconectado: ${socket.id}`)
    })
  })
}

// ─────────────────────────────────────────────
// HELPER: filtrar estado para que un jugador
// no vea las cartas de los demás
// ─────────────────────────────────────────────
function filtrarEstado(estado: any, miId: string): EstadoJuegoCliente {
  return {
    ...estado,
    miId,
    jugadores: estado.jugadores.map((j: any): JugadorCliente => ({
      ...j,
      cantidadCartas: j.mano.length,
      mano: j.id === miId
        ? j.mano
        : j.mano.map(() => ({ valor: 0, palo: 'espadas', esMuestra: false, esComodin: false, oculta: true })),
    })),
  }
}
