'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSocket } from '../../lib/socket'
import { useGameStore } from '../../lib/store/gameStore'

type DificultadBot = 'facil' | 'medio' | 'dificil'
type JugadorLobby = { jugadorId: string; nombre: string; equipo: number; esBot?: boolean }
type SalaInfo = { salaId: string; anfitrion: string; cantidadJugadores: number }
type Vista = 'inicio' | 'unirse'

const OPCIONES_BOT: { dificultad: DificultadBot; label: string; desc: string; color: string }[] = [
  { dificultad: 'facil',   label: 'Novato',  desc: 'Juega random',         color: 'bg-green-700 hover:bg-green-600' },
  { dificultad: 'medio',   label: 'Jugador', desc: 'Algo de estrategia',   color: 'bg-yellow-600 hover:bg-yellow-500' },
  { dificultad: 'dificil', label: 'Maestro', desc: 'Casi imposible ganar', color: 'bg-red-700 hover:bg-red-600' },
]

export default function LobbyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setSala, setEstado } = useGameStore()

  const [vista, setVista] = useState<Vista>(
    searchParams.get('vista') === 'unirse' ? 'unirse' : 'inicio'
  )
  const [fase, setFase] = useState<'lobby' | 'esperando'>('lobby')
  const [nombre, setNombre] = useState('')
  const [salaId, setSalaId] = useState('')
  const [jugadores, setJugadores] = useState<JugadorLobby[]>([])
  const [esAnfitrion, setEsAnfitrion] = useState(false)
  const [error, setError] = useState('')
  const [mostrarOpcionesBot, setMostrarOpcionesBot] = useState(false)
  const [salasDisponibles, setSalasDisponibles] = useState<SalaInfo[]>([])

  const salaIdRef = useRef('')
  const esAnfitrionRef = useRef(false)

  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) socket.connect()
    socket.emit('OBTENER_SALAS')

    socket.on('LISTA_SALAS', (salas: SalaInfo[]) => setSalasDisponibles(salas))

    socket.on('SALA_CREADA', ({ salaId: id, jugadores: jug }: { salaId: string; jugadores: JugadorLobby[] }) => {
      salaIdRef.current = id
      esAnfitrionRef.current = true
      setSalaId(id)
      setSala(id, socket.id!)
      setJugadores(jug)
      setEsAnfitrion(true)
      setFase('esperando')
    })

    socket.on('JUGADORES_SALA', ({ jugadores: jug }: { jugadores: JugadorLobby[] }) => {
      setJugadores(jug)
      if (!esAnfitrionRef.current && salaIdRef.current) {
        setSala(salaIdRef.current, socket.id!)
        setFase('esperando')
      }
    })

    socket.on('PARTIDA_INICIADA', (estado) => {
      setEstado(estado)
      router.push(`/game/${salaIdRef.current}`)
    })

    socket.on('SALA_DISUELTA', ({ mensaje }: { mensaje: string }) => {
      setError(mensaje)
      setFase('lobby')
      setVista('inicio')
      salaIdRef.current = ''
      esAnfitrionRef.current = false
    })

    socket.on('ERROR', ({ mensaje }: { mensaje: string }) => {
      setError(mensaje)
    })

    return () => {
      socket.off('LISTA_SALAS')
      socket.off('SALA_CREADA')
      socket.off('JUGADORES_SALA')
      socket.off('PARTIDA_INICIADA')
      socket.off('SALA_DISUELTA')
      socket.off('ERROR')
    }
  }, [setSala, setEstado, router])

  const crearSala = () => {
    if (!nombre.trim()) return
    setError('')
    getSocket().emit('CREAR_SALA', { nombre: nombre.trim(), equipo: 1 })
  }

  const unirseASala = (id: string) => {
    if (!nombre.trim()) { setError('Primero ingresá tu nombre'); return }
    setError('')
    salaIdRef.current = id
    setSalaId(id)
    // El servidor asigna el equipo automáticamente
    getSocket().emit('UNIRSE_SALA', { salaId: id, nombre: nombre.trim() })
  }

  const iniciarPartida = () => getSocket().emit('INICIAR_PARTIDA', {})

  const agregarBot = (dificultad: DificultadBot) => {
    getSocket().emit('AGREGAR_BOT', { dificultad })
    setMostrarOpcionesBot(false)
  }

  // ── SALA DE ESPERA ───────────────────────────────────────────────────────
  if (fase === 'esperando') {
    const equipo1 = jugadores.filter(j => j.equipo === 1)
    const equipo2 = jugadores.filter(j => j.equipo === 2)
    const total = jugadores.length
    const hayLugar = total < 4
    const puedeIniciar = total === 2 || total === 4
    const equiposBalanceados = equipo1.length === equipo2.length

    const mensajeEstado = !puedeIniciar
      ? `Necesitás ${total < 2 ? 2 - total : 4 - total} jugador(es) más para completar la mesa`
      : !equiposBalanceados
      ? 'Los equipos deben estar equilibrados'
      : '¡Todo listo para jugar!'

    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <div className="text-center">
          <p className="text-green-400 text-sm uppercase tracking-widest mb-1">Sala de espera</p>
          <h1 className="text-2xl font-black text-white">Juntando la mesa...</h1>
          <p className="text-green-600 text-xs mt-1">Solo 1 vs 1 o 2 vs 2</p>
        </div>

        {/* Vista de equipos */}
        <div className="w-full max-w-md">
          <div className="grid grid-cols-2 gap-3">
            {/* Equipo 1 */}
            <div className="bg-blue-950/40 border border-blue-800 rounded-2xl p-3">
              <p className="text-blue-400 text-xs uppercase tracking-widest mb-2 text-center font-bold">
                Equipo 1
              </p>
              <div className="flex flex-col gap-1.5">
                {equipo1.map(j => (
                  <div key={j.jugadorId} className="flex items-center gap-2 bg-blue-900/30 rounded-lg px-2 py-1.5">
                    <span>{j.esBot ? '🤖' : '👤'}</span>
                    <span className="text-white text-sm font-bold truncate">{j.nombre}</span>
                    {j.esBot && <span className="ml-auto text-[10px] text-purple-400">bot</span>}
                  </div>
                ))}
                {equipo1.length === 0 && (
                  <div className="text-blue-800 text-xs text-center py-2">vacío</div>
                )}
                {esAnfitrion && hayLugar && equipo1.length < 2 && (
                  <div className="border border-dashed border-blue-800 rounded-lg px-2 py-1 text-center text-blue-800 text-xs">
                    + slot libre
                  </div>
                )}
              </div>
            </div>

            {/* Equipo 2 */}
            <div className="bg-orange-950/40 border border-orange-800 rounded-2xl p-3">
              <p className="text-orange-400 text-xs uppercase tracking-widest mb-2 text-center font-bold">
                Equipo 2
              </p>
              <div className="flex flex-col gap-1.5">
                {equipo2.map(j => (
                  <div key={j.jugadorId} className="flex items-center gap-2 bg-orange-900/30 rounded-lg px-2 py-1.5">
                    <span>{j.esBot ? '🤖' : '👤'}</span>
                    <span className="text-white text-sm font-bold truncate">{j.nombre}</span>
                    {j.esBot && <span className="ml-auto text-[10px] text-purple-400">bot</span>}
                  </div>
                ))}
                {equipo2.length === 0 && (
                  <div className="text-orange-800 text-xs text-center py-2">vacío</div>
                )}
                {esAnfitrion && hayLugar && equipo2.length < 2 && (
                  <div className="border border-dashed border-orange-800 rounded-lg px-2 py-1 text-center text-orange-800 text-xs">
                    + slot libre
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agregar bot */}
          {esAnfitrion && hayLugar && (
            <div className="mt-3">
              {mostrarOpcionesBot ? (
                <div className="bg-green-900/40 border border-green-800 rounded-2xl p-3 flex flex-col gap-2">
                  <p className="text-green-500 text-xs text-center mb-1">Elegí la dificultad del bot</p>
                  {OPCIONES_BOT.map(({ dificultad, label, desc, color }) => (
                    <button key={dificultad} onClick={() => agregarBot(dificultad)}
                      className={`${color} text-white rounded-xl px-4 py-2 flex justify-between items-center transition-colors`}>
                      <span className="font-bold">🤖 {label}</span>
                      <span className="text-xs opacity-80">{desc}</span>
                    </button>
                  ))}
                  <button onClick={() => setMostrarOpcionesBot(false)} className="text-green-600 text-xs text-center mt-1 hover:text-green-400">
                    cancelar
                  </button>
                </div>
              ) : (
                <button onClick={() => setMostrarOpcionesBot(true)}
                  className="w-full border border-dashed border-green-800 rounded-2xl py-3 text-green-600 hover:text-green-400 text-sm text-center transition-colors">
                  + Agregar bot
                </button>
              )}
            </div>
          )}
        </div>

        {/* Estado y botón iniciar */}
        <div className="w-full max-w-md flex flex-col gap-2">
          <p className={[
            'text-xs text-center',
            puedeIniciar && equiposBalanceados ? 'text-green-400' : 'text-yellow-500',
          ].join(' ')}>
            {mensajeEstado}
          </p>

          {esAnfitrion ? (
            <button
              onClick={iniciarPartida}
              disabled={!puedeIniciar || !equiposBalanceados}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-green-900 disabled:text-green-700 text-black font-black py-4 px-8 rounded-2xl text-lg transition-all w-full shadow-lg disabled:shadow-none">
              ¡Dale, jugamos!
            </button>
          ) : (
            <p className="text-green-500 text-sm text-center">El anfitrión va a iniciar la partida...</p>
          )}
        </div>
      </div>
    )
  }

  // ── LOBBY ────────────────────────────────────────────────────────────────

  const inputNombre = (
    <input
      type="text"
      placeholder="¿Cómo te llamás?"
      value={nombre}
      onChange={(e) => { setNombre(e.target.value); setError('') }}
      className="bg-green-900 border border-green-700 rounded-xl px-4 py-3 text-white placeholder-green-600 w-full focus:outline-none focus:border-yellow-500 transition-colors"
      maxLength={20}
      autoFocus
    />
  )

  const errorBanner = error && (
    <div className="bg-red-950/60 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm w-full max-w-sm text-center">
      {error}
    </div>
  )

  // ── INICIO ───────────────────────────────────────────────────────────────
  if (vista === 'inicio') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🃏</div>
          <h1 className="text-3xl font-black text-white">¿Jugamos?</h1>
          <p className="text-green-600 text-xs mt-1">1 vs 1 o 2 vs 2</p>
        </div>
        {errorBanner}
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {inputNombre}
          <button onClick={crearSala} disabled={!nombre.trim()}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-green-900 disabled:text-green-700 text-black font-black py-4 rounded-2xl text-lg transition-colors shadow-lg disabled:shadow-none">
            Crear sala
          </button>
          <button onClick={() => setVista('unirse')}
            className="bg-green-800 hover:bg-green-700 text-white font-bold py-3 rounded-2xl text-sm transition-colors">
            Unirse a sala existente
          </button>
          <button onClick={() => router.push('/')} className="text-green-500 hover:text-green-400 text-sm text-center transition-colors">
            ← Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // ── UNIRSE: lista de salas ────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🃏</div>
        <h1 className="text-3xl font-black text-white">Unirse a salas</h1>
      </div>
      {errorBanner}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {inputNombre}
        <div className="flex flex-col gap-2">
          {salasDisponibles.length === 0 ? (
            <div className="text-center text-green-700 text-sm py-8 border border-dashed border-green-900 rounded-2xl">
              No hay salas esperando jugadores
            </div>
          ) : (
            salasDisponibles.map((sala) => (
              <div key={sala.salaId} className="bg-green-900/40 border border-green-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{sala.anfitrion}</p>
                  <p className="text-green-500 text-xs">{sala.cantidadJugadores}/4 jugadores</p>
                </div>
                <button onClick={() => unirseASala(sala.salaId)}
                  className="bg-green-700 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                  Unirse
                </button>
              </div>
            ))
          )}
        </div>
        <button onClick={() => setVista('inicio')} className="text-green-500 hover:text-green-400 text-sm text-center transition-colors">
          ← Volver
        </button>
      </div>
    </div>
  )
}
