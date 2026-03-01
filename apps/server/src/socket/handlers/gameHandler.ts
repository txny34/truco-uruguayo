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
      socket.emit('SALA_CREADA', {
        salaId,
        jugadores: [{ jugadorId: socket.id, nombre, equipo }],
      })
    })

    socket.on('UNIRSE_SALA', ({ salaId, nombre, equipo }) => {
      const ok = RoomManager.agregarJugador(salaId, socket.id)
      if (!ok) {
        socket.emit('ERROR', { mensaje: `Sala ${salaId} no existe o está llena` })
        return
      }
      socket.join(salaId)
      socket.data = { salaId, jugadorId: socket.id, nombre, equipo }
      io.to(salaId).emit('JUGADORES_SALA', { jugadores: getJugadoresDeSala(io, salaId) })
    })

    // ── INICIO DE PARTIDA ──────────────────────
    socket.on('INICIAR_PARTIDA', () => {
      const { salaId } = socket.data
      const jugadores = getJugadoresDeSala(io, salaId).map((j) => ({
        id: j.jugadorId,
        nombre: j.nombre,
        equipo: j.equipo,
      }))
      const ok = RoomManager.iniciarPartida(salaId, jugadores)
      if (!ok) return

      const engine = RoomManager.getEngine(salaId)!
      const estado = engine.repartir()
      // Emitir PARTIDA_INICIADA para que el lobby navegue a la sala
      for (const jugador of estado.jugadores) {
        const s = io.sockets.sockets.get(jugador.id)
        if (s) s.emit('PARTIDA_INICIADA', filtrarEstado(estado, jugador.id))
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

      const nuevoEstado = RoomManager.getEngine(salaId)!.jugarCarta(jugadorId, carta)
      emitirEstado(io, salaId, nuevoEstado)
    })

    // ── CANTOS DE TRUCO ────────────────────────
    socket.on('CANTAR_TRUCO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'CANTAR_TRUCO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.cantarTruco(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
    })

    socket.on('CANTAR_RETRUCO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'CANTAR_RETRUCO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.cantarRetruco(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
    })

    socket.on('CANTAR_VALE_CUATRO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'CANTAR_VALE_CUATRO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.cantarValeCuatro(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
    })

    // ── ENVIDO ─────────────────────────────────
    socket.on('CANTAR_ENVIDO', ({ tipo }) => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const nuevoEstado = RoomManager.getEngine(salaId)!.cantarEnvido(jugadorId, tipo)
      emitirEstado(io, salaId, nuevoEstado)
    })

    socket.on('CANTAR_FLOR', () => {
      const { salaId, jugadorId } = socket.data
      io.to(salaId).emit('FLOR_CANTADA', { jugadorId, nombre: socket.data.nombre })
    })

    // ── RESPUESTAS ─────────────────────────────
    socket.on('QUIERO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'QUIERO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.quiero(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
    })

    socket.on('NO_QUIERO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'NO_QUIERO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.noQuiero(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
    })

    socket.on('IR_AL_MAZO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'IR_AL_MAZO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.irAlMazo(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
    })

    // ── SIGUIENTE MANO ─────────────────────────
    socket.on('SIGUIENTE_MANO', () => {
      const { salaId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado || estado.fase !== 'fin_mano') return

      const nuevoEstado = RoomManager.getEngine(salaId)!.siguienteMano()
      emitirEstado(io, salaId, nuevoEstado)
    })

    // ── DESCONEXIÓN ───────────────────────────
    socket.on('disconnect', () => {
      const salaId = RoomManager.removerJugador(socket.id)
      if (salaId) {
        io.to(salaId).emit('JUGADOR_DESCONECTADO', {
          jugadorId: socket.id,
          nombre: socket.data?.nombre,
        })
        io.to(salaId).emit('JUGADORES_SALA', { jugadores: getJugadoresDeSala(io, salaId) })
      }
      console.log(`🔴 Desconectado: ${socket.id}`)
    })
  })
}

// ─────────────────────────────────────────────
// HELPER: broadcast estado filtrado a cada jugador
// ─────────────────────────────────────────────
function emitirEstado(io: Server, salaId: string, estado: any): void {
  for (const jugador of estado.jugadores) {
    const s = io.sockets.sockets.get(jugador.id)
    if (s) s.emit('ESTADO_ACTUALIZADO', filtrarEstado(estado, jugador.id))
  }
}

// ─────────────────────────────────────────────
// HELPER: lista de jugadores en una sala
// ─────────────────────────────────────────────
function getJugadoresDeSala(io: Server, salaId: string) {
  const socketIds = io.sockets.adapter.rooms.get(salaId) ?? new Set<string>()
  const jugadores: { jugadorId: string; nombre: string; equipo: number }[] = []
  for (const sid of socketIds) {
    const s = io.sockets.sockets.get(sid)
    if (s?.data?.nombre) {
      jugadores.push({ jugadorId: sid, nombre: s.data.nombre, equipo: s.data.equipo })
    }
  }
  return jugadores
}

// ─────────────────────────────────────────────
// HELPER: filtrar estado por jugador
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
        : j.mano.map(() => ({
            valor: 0,
            palo: 'espadas',
            esMuestra: false,
            esComodin: false,
            oculta: true,
          })),
    })),
  }
}
