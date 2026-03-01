'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSocket } from '../../lib/socket'
import { useGameStore } from '../../lib/store/gameStore'

type JugadorLobby = { jugadorId: string; nombre: string; equipo: number }

const EMOJIS_JUGADOR = ['👑', '🎴', '🃏', '🎭']

export default function LobbyPage() {
  const router = useRouter()
  const { setSala, setEstado } = useGameStore()

  const [fase, setFase] = useState<'entrada' | 'esperando'>('entrada')
  const [nombre, setNombre] = useState('')
  const [codigoInput, setCodigoInput] = useState('')
  const [salaId, setSalaId] = useState('')
  const [jugadores, setJugadores] = useState<JugadorLobby[]>([])
  const [esAnfitrion, setEsAnfitrion] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')

  // Refs para evitar closures viejos en callbacks de socket
  const salaIdRef = useRef('')
  const esAnfitrionRef = useRef(false)

  useEffect(() => {
    const socket = getSocket()

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
      // El que se une pasa a sala de espera cuando recibe confirmación del server
      if (!esAnfitrionRef.current && salaIdRef.current) {
        setSala(salaIdRef.current, socket.id!)
        setFase('esperando')
      }
    })

    socket.on('PARTIDA_INICIADA', (estado) => {
      setEstado(estado)
      router.push(`/game/${salaIdRef.current}`)
    })

    socket.on('ERROR', ({ mensaje }: { mensaje: string }) => {
      setError(mensaje)
      setFase('entrada')
      salaIdRef.current = ''
    })

    return () => {
      socket.off('SALA_CREADA')
      socket.off('JUGADORES_SALA')
      socket.off('PARTIDA_INICIADA')
      socket.off('ERROR')
    }
  }, [setSala, setEstado, router])

  const crearSala = () => {
    if (!nombre.trim()) return
    setError('')
    const socket = getSocket()
    if (!socket.connected) socket.connect()
    socket.emit('CREAR_SALA', { nombre: nombre.trim(), equipo: 1 })
  }

  const unirseASala = () => {
    if (!nombre.trim() || !codigoInput.trim()) return
    setError('')
    const id = codigoInput.toUpperCase()
    salaIdRef.current = id
    setSalaId(id)
    const socket = getSocket()
    if (!socket.connected) socket.connect()
    socket.emit('UNIRSE_SALA', { salaId: id, nombre: nombre.trim(), equipo: 2 })
  }

  const iniciarPartida = () => {
    const socket = getSocket()
    socket.emit('INICIAR_PARTIDA', {})
  }

  const copiarCodigo = async () => {
    await navigator.clipboard.writeText(salaId)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  // ── SALA DE ESPERA ──────────────────────────
  if (fase === 'esperando') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <div className="text-center">
          <p className="text-green-400 text-sm uppercase tracking-widest mb-1">Sala de espera</p>
          <h1 className="text-2xl font-black text-white">Juntando la mesa...</h1>
        </div>

        {/* Código de sala */}
        <div className="bg-green-900/50 border border-green-700 rounded-2xl p-6 w-full max-w-sm text-center">
          <p className="text-green-400 text-xs uppercase tracking-widest mb-3">
            Mandales este código a tus compas
          </p>
          <div className="text-5xl font-black tracking-[0.2em] text-yellow-400 mb-4 font-mono">
            {salaId}
          </div>
          <button
            onClick={copiarCodigo}
            className="bg-green-800 hover:bg-green-700 text-white text-sm px-5 py-2 rounded-xl transition-colors font-semibold"
          >
            {copiado ? '✓ ¡Copiado!' : '📋 Copiar código'}
          </button>
        </div>

        {/* Lista de jugadores */}
        <div className="w-full max-w-sm">
          <p className="text-green-500 text-xs uppercase tracking-widest mb-3 text-center">
            En la mesa ({jugadores.length} / 4)
          </p>
          <div className="flex flex-col gap-2">
            {jugadores.map((j, i) => (
              <div
                key={j.jugadorId}
                className="bg-green-900/40 border border-green-800 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <span className="text-2xl">{EMOJIS_JUGADOR[i] ?? '🎴'}</span>
                <span className="text-white font-bold">{j.nombre}</span>
                {i === 0 && (
                  <span className="ml-auto text-xs text-yellow-400 font-semibold">anfitrión</span>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 2 - jugadores.length) }).map((_, i) => (
              <div
                key={`vacio-${i}`}
                className="border border-dashed border-green-800 rounded-xl px-4 py-3 text-center text-green-700 text-sm"
              >
                Esperando jugador...
              </div>
            ))}
          </div>
        </div>

        {esAnfitrion ? (
          <button
            onClick={iniciarPartida}
            disabled={jugadores.length < 2}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-green-900 disabled:text-green-700 text-black font-black py-4 px-8 rounded-2xl text-lg transition-all w-full max-w-sm shadow-lg disabled:shadow-none"
          >
            {jugadores.length < 2 ? 'Esperando más jugadores...' : '¡Dale, jugamos!'}
          </button>
        ) : (
          <p className="text-green-500 text-sm text-center">
            El anfitrión va a iniciar la partida...
          </p>
        )}
      </div>
    )
  }

  // ── ENTRADA ─────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🃏</div>
        <h1 className="text-3xl font-black text-white">¿Jugamos?</h1>
        <p className="text-green-400 mt-1 text-sm">Creá una sala o unite con el código</p>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm w-full max-w-sm text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="¿Cómo te llamás?"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && crearSala()}
          className="bg-green-900 border border-green-700 rounded-xl px-4 py-3 text-white placeholder-green-600 w-full focus:outline-none focus:border-yellow-500 transition-colors"
          maxLength={20}
          autoFocus
        />

        <button
          onClick={crearSala}
          disabled={!nombre.trim()}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-green-900 disabled:text-green-700 text-black font-black py-4 rounded-2xl text-lg transition-colors shadow-lg disabled:shadow-none"
        >
          Crear sala nueva
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-green-800" />
          <span className="text-green-600 text-sm">o unite con código</span>
          <div className="flex-1 h-px bg-green-800" />
        </div>

        <input
          type="text"
          placeholder="CÓDIGO"
          value={codigoInput}
          onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
          className="bg-green-900 border border-green-700 rounded-xl px-4 py-3 text-white placeholder-green-600 text-center uppercase tracking-[0.3em] font-mono text-xl focus:outline-none focus:border-yellow-500 transition-colors"
          maxLength={6}
        />

        <button
          onClick={unirseASala}
          disabled={!nombre.trim() || codigoInput.length < 4}
          className="bg-green-700 hover:bg-green-600 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          Unirse a la sala
        </button>
      </div>
    </div>
  )
}
