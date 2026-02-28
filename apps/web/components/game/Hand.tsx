'use client'
import type { Carta } from '@truco/game-core'
import { getSocket } from '../../lib/socket'

interface HandProps { cartas: Carta[] }

export function Hand({ cartas }: HandProps) {
  const jugarCarta = (carta: Carta) => {
    getSocket().emit('JUGAR_CARTA', { carta })
  }

  return (
    <div className="flex justify-center gap-3">
      {cartas.map((carta, i) => (
        <button
          key={i}
          onClick={() => jugarCarta(carta)}
          className={[
            'rounded-xl px-4 py-5 shadow-2xl border-2 cursor-pointer transition-all duration-150',
            'hover:-translate-y-3 hover:shadow-yellow-400/30 active:scale-95',
            carta.esMuestra
              ? 'bg-yellow-50 border-yellow-400 text-yellow-900'
              : carta.esComodin
              ? 'bg-purple-50 border-purple-400 text-purple-900'
              : 'bg-white border-gray-200 text-gray-900',
          ].join(' ')}
        >
          <div className="text-3xl font-bold text-center w-10">{carta.valor}</div>
          <div className="text-xs text-center capitalize mt-1 opacity-70">{carta.palo}</div>
          {carta.esMuestra && <div className="text-xs text-yellow-600 text-center mt-1">★ muestra</div>}
          {carta.esComodin && <div className="text-xs text-purple-600 text-center mt-1">★ comodín</div>}
        </button>
      ))}
    </div>
  )
}
