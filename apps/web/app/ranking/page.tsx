'use client'
import { useState, useEffect } from 'react'
import { getSocket } from '../../lib/socket'
import Link from 'next/link'

interface EntradaRanking {
  nombre: string
  elo: number
  victorias: number
  derrotas: number
  partidasJugadas: number
}

const MEDALLAS = ['🥇', '🥈', '🥉']

export default function RankingPage() {
  const [ranking, setRanking] = useState<EntradaRanking[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    socket.once('RANKING', ({ ranking: data }: { ranking: EntradaRanking[] }) => {
      setRanking(data)
      setCargando(false)
    })

    socket.emit('SOLICITAR_RANKING')

    return () => {
      socket.off('RANKING')
    }
  }, [])

  const winrate = (v: number, d: number) => {
    if (v + d === 0) return '—'
    return `${Math.round((v / (v + d)) * 100)}%`
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="text-3xl font-black text-white">Ranking ELO</h1>
          <p className="text-green-500 text-sm mt-1">Top jugadores de la sesión</p>
        </div>

        {/* Tabla */}
        {cargando ? (
          <div className="text-center text-green-500 py-12">Cargando ranking...</div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-green-900 rounded-2xl">
            <div className="text-4xl mb-3">😴</div>
            <p className="text-green-600">Nadie jugó todavía.</p>
            <p className="text-green-700 text-sm mt-1">Jugá una partida para aparecer acá.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ranking.map((entrada, i) => (
              <div
                key={entrada.nombre + i}
                className={[
                  'flex items-center gap-4 px-4 py-3 rounded-2xl border transition-colors',
                  i === 0
                    ? 'bg-yellow-900/30 border-yellow-600/50'
                    : i === 1
                    ? 'bg-gray-800/40 border-gray-600/30'
                    : i === 2
                    ? 'bg-orange-900/20 border-orange-700/30'
                    : 'bg-green-900/20 border-green-800/30',
                ].join(' ')}
              >
                {/* Posición */}
                <div className="w-8 text-center text-xl font-black shrink-0">
                  {i < 3 ? MEDALLAS[i] : <span className="text-green-600 text-base">#{i + 1}</span>}
                </div>

                {/* Nombre + stats */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold truncate">{entrada.nombre}</div>
                  <div className="text-green-600 text-xs">
                    {entrada.victorias}V / {entrada.derrotas}D · {winrate(entrada.victorias, entrada.derrotas)} winrate
                  </div>
                </div>

                {/* ELO */}
                <div className="text-right shrink-0">
                  <div className="text-yellow-400 font-black text-lg">{entrada.elo}</div>
                  <div className="text-green-600 text-xs">ELO</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-3 mt-8">
          <Link
            href="/matchmaking"
            className="text-center bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 px-8 rounded-2xl text-base transition-colors"
          >
            ⚔️ Jugar partida competitiva
          </Link>
          <Link
            href="/"
            className="text-center text-green-500 hover:text-green-400 text-sm transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
