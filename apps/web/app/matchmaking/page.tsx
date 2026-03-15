'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSocket } from '../../lib/socket'
import { useGameStore } from '../../lib/store/gameStore'

interface ColaUpdate {
  enCola: boolean
  posicion: number
  elo: number
}

interface PartidaEncontrada {
  salaId: string
  rival: { nombre: string; elo: number }
  miElo: number
}

interface DatosElo {
  nombre: string
  elo: number
  victorias: number
  derrotas: number
  partidasJugadas: number
}

export default function MatchmakingPage() {
  const router = useRouter()
  const { setSala, setEstado } = useGameStore()

  const [nombre, setNombre] = useState('')
  const [fase, setFase] = useState<'inicio' | 'buscando' | 'encontrado'>('inicio')
  const [datosElo, setDatosElo] = useState<DatosElo | null>(null)
  const [cola, setCola] = useState<ColaUpdate | null>(null)
  const [rival, setRival] = useState<PartidaEncontrada | null>(null)
  const [segundos, setSegundos] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const salaIdRef = useRef('')

  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    socket.on('MIS_DATOS_ELO', (datos: DatosElo) => {
      setDatosElo(datos)
    })

    socket.on('COLA_ACTUALIZADA', (data: ColaUpdate) => {
      setCola(data)
      if (!data.enCola) {
        setFase('inicio')
        if (intervalRef.current) clearInterval(intervalRef.current)
        setSegundos(0)
      }
    })

    socket.on('PARTIDA_ENCONTRADA', (data: PartidaEncontrada) => {
      setRival(data)
      setFase('encontrado')
      salaIdRef.current = data.salaId
      if (intervalRef.current) clearInterval(intervalRef.current)
    })

    socket.on('PARTIDA_INICIADA', (estado) => {
      setEstado(estado)
      router.push(`/game/${salaIdRef.current}`)
    })

    socket.on('ESTADO_ACTUALIZADO', (estado) => {
      setEstado(estado)
    })

    return () => {
      socket.off('MIS_DATOS_ELO')
      socket.off('COLA_ACTUALIZADA')
      socket.off('PARTIDA_ENCONTRADA')
      socket.off('PARTIDA_INICIADA')
      socket.off('ESTADO_ACTUALIZADO')
    }
  }, [setSala, setEstado, router])

  const buscarPartida = () => {
    if (!nombre.trim()) return
    const socket = getSocket()
    socket.emit('SOLICITAR_ELO', { nombre: nombre.trim() })
    socket.emit('BUSCAR_PARTIDA', { nombre: nombre.trim() })
    setFase('buscando')
    setSegundos(0)
    intervalRef.current = setInterval(() => setSegundos((s) => s + 1), 1000)
  }

  const cancelar = () => {
    getSocket().emit('CANCELAR_BUSQUEDA')
    setFase('inicio')
    setCola(null)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSegundos(0)
  }

  const formatSegundos = (s: number) => {
    const m = Math.floor(s / 60)
    const ss = s % 60
    return `${m}:${ss.toString().padStart(2, '0')}`
  }

  // ── ENCONTRADO ──────────────────────────────────────────────
  if (fase === 'encontrado' && rival) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🎯</div>
          <h1 className="text-3xl font-black text-white">¡Partida encontrada!</h1>
          <p className="text-green-400 text-sm mt-2">Entrando a la mesa...</p>
        </div>
        <div className="bg-green-900/50 border border-green-700 rounded-2xl p-6 w-full max-w-sm">
          <p className="text-green-500 text-xs uppercase tracking-widest text-center mb-4">Tu rival</p>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-white font-black text-lg">{nombre}</div>
              <div className="text-yellow-400 font-bold">{rival.miElo} ELO</div>
            </div>
            <div className="text-green-500 text-xl font-bold">vs</div>
            <div className="text-center flex-1">
              <div className="text-white font-black text-lg">{rival.rival.nombre}</div>
              <div className="text-yellow-400 font-bold">{rival.rival.elo} ELO</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── BUSCANDO ────────────────────────────────────────────────
  if (fase === 'buscando') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-2xl font-black text-white">Buscando partida...</h1>
          {cola && (
            <p className="text-green-400 text-sm mt-1">
              Posición en cola: #{cola.posicion}
            </p>
          )}
        </div>

        {/* Animación de espera */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-yellow-400"
              style={{
                animation: 'bounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        <div className="text-green-500 text-sm font-mono">{formatSegundos(segundos)}</div>

        {datosElo && (
          <div className="bg-green-900/40 border border-green-800 rounded-xl px-5 py-3 text-center">
            <div className="text-xs text-green-500 uppercase tracking-widest mb-1">Tu ELO</div>
            <div className="text-2xl font-black text-yellow-400">{datosElo.elo}</div>
            <div className="text-xs text-green-600 mt-1">
              {datosElo.victorias}V / {datosElo.derrotas}D
            </div>
          </div>
        )}

        <button
          onClick={cancelar}
          className="text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 px-5 py-2 rounded-xl text-sm transition-colors"
        >
          Cancelar búsqueda
        </button>
      </div>
    )
  }

  // ── INICIO ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
      <div className="text-center">
        <div className="text-5xl mb-3">⚔️</div>
        <h1 className="text-3xl font-black text-white">Partida Competitiva</h1>
        <p className="text-green-400 text-sm mt-2">
          Te emparejamos con alguien de tu nivel
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="¿Cómo te llamás?"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && buscarPartida()}
          className="bg-green-900 border border-green-700 rounded-xl px-4 py-3 text-white placeholder-green-600 w-full focus:outline-none focus:border-yellow-500 transition-colors"
          maxLength={20}
          autoFocus
        />

        <button
          onClick={buscarPartida}
          disabled={!nombre.trim()}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-green-900 disabled:text-green-700 text-black font-black py-4 rounded-2xl text-lg transition-colors shadow-lg disabled:shadow-none"
        >
          ⚔️ Buscar partida
        </button>

        <div className="grid grid-cols-2 gap-3">
          <a
            href="/ranking"
            className="text-center border border-green-800 hover:border-green-600 text-green-400 hover:text-white text-sm font-semibold py-2 px-4 rounded-xl transition-colors"
          >
            🏆 Ranking
          </a>
          <a
            href="/lobby"
            className="text-center border border-green-800 hover:border-green-600 text-green-400 hover:text-white text-sm font-semibold py-2 px-4 rounded-xl transition-colors"
          >
            👥 Sala libre
          </a>
        </div>

        <button
          onClick={() => router.push('/')}
          className="text-green-600 hover:text-green-400 text-sm text-center transition-colors"
        >
          ← Volver al inicio
        </button>
      </div>

      {/* Info sobre ELO */}
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 text-sm text-green-500 leading-relaxed">
        <p className="font-bold text-white mb-1">¿Cómo funciona el ELO?</p>
        <p>Todos empezamos en 1000. Ganás ELO al ganar partidas, especialmente contra rivales más fuertes. El sistema K=32 actualiza tu ELO al terminar cada partida.</p>
      </div>
    </div>
  )
}
