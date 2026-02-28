'use client'
import type { CartaEnMesa, JugadorCliente } from '@truco/game-core'

interface MesaProps {
  cartasEnMesa: CartaEnMesa[]
  jugadores: JugadorCliente[]
}

export function Mesa({ cartasEnMesa, jugadores }: MesaProps) {
  if (cartasEnMesa.length === 0) {
    return (
      <div className="w-64 h-40 border-2 border-dashed border-green-600 rounded-2xl flex items-center justify-center">
        <span className="text-green-500 text-sm">Mesa vacía</span>
      </div>
    )
  }

  return (
    <div className="flex gap-4 flex-wrap justify-center">
      {cartasEnMesa.map((cm, i) => {
        const jugador = jugadores.find((j) => j.id === cm.jugadorId)
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={[
              'bg-white rounded-lg px-4 py-3 shadow-lg border-2',
              cm.carta.esMuestra ? 'border-yellow-400' : 'border-gray-200',
            ].join(' ')}>
              <div className="text-2xl font-bold text-center">{cm.carta.valor}</div>
              <div className="text-xs capitalize text-center text-gray-500">{cm.carta.palo}</div>
            </div>
            <span className="text-xs text-green-400">{jugador?.nombre}</span>
          </div>
        )
      })}
    </div>
  )
}
