'use client'
import type { Carta } from '@truco/game-core'
import { getSocket } from '../../lib/socket'
import { CartaImg } from './CartaImg'

interface HandProps { cartas: Carta[] }

export function Hand({ cartas }: HandProps) {
  const jugarCarta = (carta: Carta) => {
    getSocket().emit('JUGAR_CARTA', { carta })
  }

  return (
    <div className="flex justify-center gap-2">
      {cartas.map((carta, i) => (
        <div
          key={`${carta.valor}-${carta.palo}`}
          className="animate-carta-entra"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
        >
          <CartaImg
            carta={carta}
            onClick={() => jugarCarta(carta)}
            elevada
          />
        </div>
      ))}
    </div>
  )
}
