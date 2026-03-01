'use client'
import { useGameStore } from '../../lib/store/gameStore'
import { getSocket } from '../../lib/socket'
import { Hand } from './Hand'
import { Muestra } from './Muestra'
import { ActionBar } from './ActionBar'
import { ScoreBoard } from './ScoreBoard'
import { Mesa } from './Mesa'

export function Board() {
  const { estado, miId } = useGameStore()

  if (!estado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🃏</div>
          <p className="text-green-300">Esperando jugadores...</p>
        </div>
      </div>
    )
  }

  // ── FIN DE PARTIDA ──────────────────────────
  if (estado.fase === 'fin_partida') {
    const ganador = estado.puntaje.equipo1 >= estado.puntajeMaximo ? 1 : 2
    const yo = estado.jugadores.find((j) => j.id === miId)
    const gane = yo?.equipo === ganador
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">{gane ? '🏆' : '😤'}</div>
          <h2 className="text-3xl font-black text-white mb-2">
            {gane ? '¡Ganaste!' : '¡Perdiste!'}
          </h2>
          <p className="text-green-400 mb-6">
            {estado.puntaje.equipo1} — {estado.puntaje.equipo2}
          </p>
          <button
            onClick={() => window.location.href = '/lobby'}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 px-8 rounded-2xl text-lg transition-colors"
          >
            Jugar de nuevo
          </button>
        </div>
      </div>
    )
  }

  // ── FIN DE MANO ─────────────────────────────
  if (estado.fase === 'fin_mano') {
    const ganador = estado.ganadorRonda
    const yo = estado.jugadores.find((j) => j.id === miId)
    const gane = yo?.equipo === ganador
    return (
      <div className="flex flex-col min-h-screen bg-green-900">
        <ScoreBoard puntaje={estado.puntaje} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-green-800/80 border border-green-700 rounded-2xl p-8 mx-4">
            <div className="text-5xl mb-3">{gane ? '🎉' : '😮'}</div>
            <h2 className="text-2xl font-black text-white mb-1">
              {gane ? '¡Ganaste la mano!' : 'Perdiste la mano'}
            </h2>
            <p className="text-green-400 text-sm mb-6">
              Mano {estado.manoActual} · {estado.puntaje.equipo1} — {estado.puntaje.equipo2}
            </p>
            <button
              onClick={() => getSocket().emit('SIGUIENTE_MANO')}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 px-8 rounded-2xl text-lg transition-colors"
            >
              Siguiente mano →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const yo = estado.jugadores.find((j) => j.id === miId)

  return (
    <div className="min-h-screen bg-green-900 flex flex-col">
      <ScoreBoard puntaje={estado.puntaje} />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <Muestra muestra={estado.muestra} />
        <Mesa cartasEnMesa={estado.mesa} jugadores={estado.jugadores} />
      </div>
      <div className="p-4 flex flex-col gap-4">
        {yo && <Hand cartas={yo.mano} />}
        <ActionBar estado={estado} miId={miId!} />
      </div>
    </div>
  )
}
