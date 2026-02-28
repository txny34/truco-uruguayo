'use client'
import type { Carta } from '@truco/game-core'

const EMOJI_PALO: Record<string, string> = {
  espadas: '⚔️', bastos: '🏏', oros: '🪙', copas: '🏆',
}

export function Muestra({ muestra }: { muestra: Carta | null }) {
  if (!muestra) return null
  return (
    <div className="flex flex-col items-center">
      <span className="text-yellow-300 text-xs font-semibold tracking-widest uppercase mb-2">
        La Muestra
      </span>
      <div className="bg-yellow-100 border-4 border-yellow-400 rounded-xl px-6 py-4 shadow-2xl shadow-yellow-400/20">
        <div className="text-4xl font-bold text-yellow-900 text-center">{muestra.valor}</div>
        <div className="text-sm text-yellow-800 text-center capitalize mt-1">
          {EMOJI_PALO[muestra.palo]} {muestra.palo}
        </div>
      </div>
    </div>
  )
}
