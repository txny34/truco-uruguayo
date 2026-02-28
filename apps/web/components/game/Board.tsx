'use client'
import { useGameStore } from '../../lib/store/gameStore'
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

  const yo = estado.jugadores.find((j) => j.id === miId)

  return (
    <div className="min-h-screen bg-green-900 flex flex-col">
      {/* Puntaje */}
      <ScoreBoard puntaje={estado.puntaje} />

      {/* Zona central */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <Muestra muestra={estado.muestra} />
        <Mesa cartasEnMesa={estado.mesa} jugadores={estado.jugadores} />
      </div>

      {/* Tu mano + botones */}
      <div className="p-4 flex flex-col gap-4">
        {yo && <Hand cartas={yo.mano} />}
        <ActionBar estado={estado} miId={miId!} />
      </div>
    </div>
  )
}
