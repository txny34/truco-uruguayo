import type { Server, Socket } from 'socket.io'
import { RoomManager } from '../../game/RoomManager'
import { BotRunner } from '../../game/BotRunner'
import { MatchmakingManager } from '../../game/MatchmakingManager'
import { esAccionValida } from '@truco/game-core'
import type { EstadoJuegoCliente, JugadorCliente, DificultadBot } from '@truco/game-core'

const NOMBRES_BOT: Record<DificultadBot, string> = {
  facil: 'Bot Novato',
  medio: 'Bot Jugador',
  dificil: 'Bot Maestro',
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`🟢 Conectado: ${socket.id}`)

    // ── LOBBY ──────────────────────────────────
    socket.on('OBTENER_SALAS', () => {
      socket.emit('LISTA_SALAS', buildListaSalas(io))
    })

    socket.on('CREAR_SALA', ({ nombre, equipo }) => {
      const salaId = RoomManager.crearSala('publica')
      RoomManager.agregarJugador(salaId, socket.id)
      socket.join(salaId)
      socket.data = { salaId, jugadorId: socket.id, nombre, equipo }
      socket.emit('SALA_CREADA', {
        salaId,
        jugadores: [{ jugadorId: socket.id, nombre, equipo }],
      })
      broadcastListaSalas(io)
    })

    socket.on('UNIRSE_SALA', ({ salaId, nombre }) => {
      // Asignar equipo automáticamente para garantizar balance
      const totalActual = getJugadoresConBots(io, salaId).length
      const equipo: 1 | 2 = ((totalActual % 2) + 1) as 1 | 2

      const ok = RoomManager.agregarJugador(salaId, socket.id)
      if (!ok) {
        socket.emit('ERROR', { mensaje: `Sala ${salaId} no existe o está llena` })
        return
      }
      socket.join(salaId)
      socket.data = { salaId, jugadorId: socket.id, nombre, equipo }
      io.to(salaId).emit('JUGADORES_SALA', { jugadores: getJugadoresConBots(io, salaId) })
      broadcastListaSalas(io)
    })

    // ── AGREGAR BOT ────────────────────────────
    socket.on('AGREGAR_BOT', ({ dificultad }: { dificultad: DificultadBot }) => {
      const { salaId } = socket.data
      const sala = RoomManager.getSala(salaId)
      if (!sala) return

      const totalJugadores = getJugadoresConBots(io, salaId).length
      if (totalJugadores >= 4) {
        socket.emit('ERROR', { mensaje: 'La sala ya está llena' })
        return
      }

      // Equipo: alternar 2, 1, 2, 1 según cuántos bots ya hay
      const equiposPorBotIndex: Record<number, 1 | 2> = { 0: 2, 1: 1, 2: 2, 3: 1 }
      const equipo = equiposPorBotIndex[sala.bots.size] ?? 2

      const botId = `bot_${dificultad}_${Date.now()}`
      RoomManager.agregarBot(salaId, botId, dificultad)

      // Registrar datos del bot para que getJugadoresConBots los encuentre
      ;(sala as any)._botData = (sala as any)._botData ?? {}
      ;(sala as any)._botData[botId] = { nombre: NOMBRES_BOT[dificultad], equipo, dificultad }

      io.to(salaId).emit('JUGADORES_SALA', { jugadores: getJugadoresConBots(io, salaId) })
    })

    // ── INICIO DE PARTIDA ──────────────────────
    socket.on('INICIAR_PARTIDA', () => {
      const { salaId } = socket.data
      const jugadores = getJugadoresConBots(io, salaId).map(j => ({
        id: j.jugadorId,
        nombre: j.nombre,
        equipo: j.equipo as 1 | 2,
        esBot: j.esBot ?? false,
        dificultadBot: j.esBot
          ? RoomManager.getDificultadBot(salaId, j.jugadorId) ?? undefined
          : undefined,
      }))

      // Solo se puede jugar de a 2 (mano a mano) o de a 4 (2 vs 2)
      if (jugadores.length !== 2 && jugadores.length !== 4) {
        socket.emit('ERROR', { mensaje: 'Solo se puede jugar de a 2 (mano a mano) o de a 4 (2 vs 2)' })
        return
      }
      const e1 = jugadores.filter(j => j.equipo === 1).length
      const e2 = jugadores.filter(j => j.equipo === 2).length
      if (e1 !== e2) {
        socket.emit('ERROR', { mensaje: 'Los equipos deben tener la misma cantidad de jugadores' })
        return
      }

      const ok = RoomManager.iniciarPartida(salaId, jugadores)
      if (!ok) return

      const engine = RoomManager.getEngine(salaId)!
      const estado = engine.repartir()

      // Emitir solo a jugadores humanos
      for (const jugador of estado.jugadores) {
        if (!jugador.esBot) {
          const s = io.sockets.sockets.get(jugador.id)
          if (s) s.emit('PARTIDA_INICIADA', filtrarEstado(estado, jugador.id))
        }
      }

      // Si el primer turno es un bot, dispararlo
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
      broadcastListaSalas(io)
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
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
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
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
    })

    socket.on('CANTAR_RETRUCO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'CANTAR_RETRUCO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.cantarRetruco(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
    })

    socket.on('CANTAR_VALE_CUATRO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'CANTAR_VALE_CUATRO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.cantarValeCuatro(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
    })

    // ── ENVIDO ─────────────────────────────────
    socket.on('CANTAR_ENVIDO', ({ tipo }) => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const nuevoEstado = RoomManager.getEngine(salaId)!.cantarEnvido(jugadorId, tipo)
      emitirEstado(io, salaId, nuevoEstado)
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
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
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
    })

    socket.on('NO_QUIERO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'NO_QUIERO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.noQuiero(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
    })

    socket.on('IR_AL_MAZO', () => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const validacion = esAccionValida(estado, jugadorId, 'IR_AL_MAZO')
      if (!validacion.valida) { socket.emit('ERROR_ACCION', validacion); return }

      const nuevoEstado = RoomManager.getEngine(salaId)!.irAlMazo(jugadorId)
      emitirEstado(io, salaId, nuevoEstado)
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
    })

    // ── SIGUIENTE MANO ─────────────────────────
    socket.on('SIGUIENTE_MANO', () => {
      const { salaId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado || estado.fase !== 'fin_mano') return

      const nuevoEstado = RoomManager.getEngine(salaId)!.siguienteMano()
      emitirEstado(io, salaId, nuevoEstado)
      BotRunner.scheduleIfBot(io, salaId, emitirEstado)
    })

    // ── SEÑAS ──────────────────────────────────
    socket.on('ENVIAR_SEÑA', ({ tipo }: { tipo: string }) => {
      const { salaId, jugadorId } = socket.data
      const estado = RoomManager.getEstado(salaId)
      if (!estado) return

      const yo = estado.jugadores.find((j) => j.id === jugadorId)
      if (!yo) return

      // Buscar compañero (mismo equipo, puede ser bot o humano)
      const companero = estado.jugadores.find(
        (j) => j.equipo === yo.equipo && j.id !== jugadorId
      )
      if (!companero) return

      if (!companero.esBot) {
        const socketCompanero = io.sockets.sockets.get(companero.id)
        if (socketCompanero) {
          socketCompanero.emit('SEÑA_RECIBIDA', {
            de: jugadorId,
            nombre: socket.data.nombre,
            tipo,
          })
        }
      }
      // Si el compañero es bot, la seña se registra pero no se emite (el bot no reacciona)
    })

    // ── MATCHMAKING ────────────────────────────
    socket.on('BUSCAR_PARTIDA', ({ nombre }: { nombre: string }) => {
      MatchmakingManager.getOCrear(socket.id, nombre)
      MatchmakingManager.entrar(socket.id, nombre)
      socket.data.nombre = nombre

      socket.emit('COLA_ACTUALIZADA', {
        enCola: true,
        posicion: MatchmakingManager.posicion(socket.id),
        elo: MatchmakingManager.getElo(socket.id),
      })

      // Intentar matchear de inmediato
      _intentarMatchear(io)
    })

    socket.on('CANCELAR_BUSQUEDA', () => {
      MatchmakingManager.salir(socket.id)
      socket.emit('COLA_ACTUALIZADA', { enCola: false, posicion: 0, elo: MatchmakingManager.getElo(socket.id) })
    })

    socket.on('SOLICITAR_RANKING', () => {
      socket.emit('RANKING', { ranking: MatchmakingManager.getRanking() })
    })

    socket.on('SOLICITAR_ELO', ({ nombre }: { nombre: string }) => {
      const datos = MatchmakingManager.getOCrear(socket.id, nombre)
      socket.emit('MIS_DATOS_ELO', datos)
    })

    // ── DESCONEXIÓN ───────────────────────────
    socket.on('disconnect', () => {
      const { salaId } = socket.data ?? {}
      const eraAnfitrion = salaId && RoomManager.esAnfitrion(salaId, socket.id)
      const partidaEnCurso = salaId && !!RoomManager.getEngine(salaId)

      MatchmakingManager.salir(socket.id)
      RoomManager.removerJugador(socket.id)

      if (salaId) {
        if (eraAnfitrion && !partidaEnCurso) {
          // Sala de espera: si el anfitrión se va, disuelve la sala
          RoomManager.eliminarSala(salaId)
          io.to(salaId).emit('SALA_DISUELTA', { mensaje: 'El anfitrión se fue, la sala se cerró.' })
        } else {
          io.to(salaId).emit('JUGADOR_DESCONECTADO', {
            jugadorId: socket.id,
            nombre: socket.data?.nombre,
          })
          io.to(salaId).emit('JUGADORES_SALA', { jugadores: getJugadoresConBots(io, salaId) })
        }
        broadcastListaSalas(io)
      }
      console.log(`🔴 Desconectado: ${socket.id}`)
    })
  })
}

// ─────────────────────────────────────────────
// HELPER: matchmaker loop
// ─────────────────────────────────────────────
function _intentarMatchear(io: Server): void {
  const par = MatchmakingManager.intentarMatchear()
  if (!par) return

  const [j1, j2] = par

  // Crear sala pública para los dos
  const salaId = _crearSalaMatchmaking(io, j1, j2)

  io.sockets.sockets.get(j1.socketId)?.emit('PARTIDA_ENCONTRADA', {
    salaId,
    rival: { nombre: j2.nombre, elo: j2.elo },
    miElo: j1.elo,
  })
  io.sockets.sockets.get(j2.socketId)?.emit('PARTIDA_ENCONTRADA', {
    salaId,
    rival: { nombre: j1.nombre, elo: j1.elo },
    miElo: j2.elo,
  })
}

function _crearSalaMatchmaking(
  io: Server,
  j1: { socketId: string; nombre: string },
  j2: { socketId: string; nombre: string }
): string {
  const salaId = RoomManager.crearSala('publica')

  const s1 = io.sockets.sockets.get(j1.socketId)
  const s2 = io.sockets.sockets.get(j2.socketId)

  if (s1) {
    RoomManager.agregarJugador(salaId, j1.socketId)
    s1.join(salaId)
    s1.data = { salaId, jugadorId: j1.socketId, nombre: j1.nombre, equipo: 1 }
  }
  if (s2) {
    RoomManager.agregarJugador(salaId, j2.socketId)
    s2.join(salaId)
    s2.data = { salaId, jugadorId: j2.socketId, nombre: j2.nombre, equipo: 2 }
  }

  const jugadores = [
    { id: j1.socketId, nombre: j1.nombre, equipo: 1 as const, esBot: false, dificultadBot: undefined },
    { id: j2.socketId, nombre: j2.nombre, equipo: 2 as const, esBot: false, dificultadBot: undefined },
  ]
  RoomManager.iniciarPartida(salaId, jugadores)
  const engine = RoomManager.getEngine(salaId)!
  const estado = engine.repartir()

  for (const jugador of estado.jugadores) {
    if (!jugador.esBot) {
      const s = io.sockets.sockets.get(jugador.id)
      if (s) s.emit('PARTIDA_INICIADA', filtrarEstado(estado, jugador.id))
    }
  }

  return salaId
}

// ─────────────────────────────────────────────
// HELPER: lista de salas disponibles
// ─────────────────────────────────────────────
function buildListaSalas(io: Server) {
  return RoomManager.getSalasEnEspera().map(({ salaId, cantidadJugadores }) => {
    const socketIds = io.sockets.adapter.rooms.get(salaId) ?? new Set<string>()
    let anfitrion = 'Jugador'
    for (const sid of socketIds) {
      const s = io.sockets.sockets.get(sid)
      if (s?.data?.nombre) { anfitrion = s.data.nombre; break }
    }
    return { salaId, anfitrion, cantidadJugadores }
  })
}

function broadcastListaSalas(io: Server) {
  io.emit('LISTA_SALAS', buildListaSalas(io))
}

// ─────────────────────────────────────────────
// HELPER: broadcast estado filtrado a cada jugador humano
// ─────────────────────────────────────────────
export function emitirEstado(io: Server, salaId: string, estado: any): void {
  for (const jugador of estado.jugadores) {
    if (jugador.esBot) continue  // los bots no tienen socket
    const s = io.sockets.sockets.get(jugador.id)
    if (s) s.emit('ESTADO_ACTUALIZADO', filtrarEstado(estado, jugador.id))
  }

  // Calcular ELO cuando la partida termina
  if (estado.fase === 'fin_partida') {
    const ganadorEquipo: number =
      estado.puntaje.equipo1 >= estado.puntajeMaximo ? 1 : 2

    const ganadores = estado.jugadores
      .filter((j: any) => !j.esBot && j.equipo === ganadorEquipo)
      .map((j: any) => ({ socketId: j.id, nombre: j.nombre }))

    const perdedores = estado.jugadores
      .filter((j: any) => !j.esBot && j.equipo !== ganadorEquipo)
      .map((j: any) => ({ socketId: j.id, nombre: j.nombre }))

    if (ganadores.length > 0 || perdedores.length > 0) {
      const resultado = MatchmakingManager.actualizarEloPartida(ganadores, perdedores)

      for (const g of resultado.ganadores) {
        const s = io.sockets.sockets.get(g.socketId)
        s?.emit('ELO_ACTUALIZADO', { eloAntes: g.eloAntes, eloNuevo: g.eloNuevo, delta: g.delta })
      }
      for (const p of resultado.perdedores) {
        const s = io.sockets.sockets.get(p.socketId)
        s?.emit('ELO_ACTUALIZADO', { eloAntes: p.eloAntes, eloNuevo: p.eloNuevo, delta: p.delta })
      }
    }
  }
}

// ─────────────────────────────────────────────
// HELPER: lista de jugadores (humanos + bots) en una sala
// ─────────────────────────────────────────────
function getJugadoresConBots(io: Server, salaId: string) {
  const socketIds = io.sockets.adapter.rooms.get(salaId) ?? new Set<string>()
  const jugadores: { jugadorId: string; nombre: string; equipo: number; esBot?: boolean }[] = []

  for (const sid of socketIds) {
    const s = io.sockets.sockets.get(sid)
    if (s?.data?.nombre) {
      jugadores.push({ jugadorId: sid, nombre: s.data.nombre, equipo: s.data.equipo })
    }
  }

  const sala = RoomManager.getSala(salaId)
  const botData = (sala as any)?._botData ?? {}
  if (sala?.bots) {
    for (const [botId] of sala.bots) {
      const data = botData[botId]
      if (data) {
        jugadores.push({
          jugadorId: botId,
          nombre: data.nombre,
          equipo: data.equipo,
          esBot: true,
        })
      }
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
