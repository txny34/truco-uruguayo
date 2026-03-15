'use client'
import type { Carta } from '@truco/game-core'
import { CartaImg } from './CartaImg'

export function Muestra({ muestra }: { muestra: Carta | null }) {
  if (!muestra) return null
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-yellow-300 text-[10px] font-semibold tracking-widest uppercase">
        La Muestra
      </span>
      <CartaImg carta={muestra} />
    </div>
  )
}
