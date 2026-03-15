'use client'
import type { Carta } from '@truco/game-core'

const PALO_SHORT: Record<string, string> = {
  espadas: 'Esp', bastos: 'Bas', oros: 'Oro', copas: 'Cop',
}
const EMOJI_PALO: Record<string, string> = {
  espadas: '⚔️', bastos: '🏏', oros: '🪙', copas: '🏆',
}

interface CartaImgProps {
  carta: Carta
  onClick?: () => void
  elevada?: boolean
  pequeña?: boolean
}

export function CartaImg({ carta, onClick, elevada = false, pequeña = false }: CartaImgProps) {
  const src = `/cards/${carta.valor}_${carta.palo}.png`

  const ring = carta.esComodin
    ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-green-900'
    : carta.esMuestra
    ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-green-900'
    : ''

  const hover = elevada
    ? 'hover:-translate-y-4 hover:shadow-2xl hover:shadow-yellow-300/30 active:scale-95 cursor-pointer'
    : ''

  const size = pequeña ? 'w-14 h-[4.5rem]' : 'w-[4.5rem] h-[6.5rem]'

  return (
    <div
      onClick={onClick}
      className={[
        'relative rounded-xl overflow-hidden shadow-lg transition-all duration-150 select-none bg-white',
        size, ring, hover,
      ].join(' ')}
    >
      {/* Imagen */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${carta.valor} de ${carta.palo}`}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Etiqueta: valor + palo — esquina superior izquierda */}
      <div className={[
        'absolute top-0 left-0 flex flex-col items-center leading-none px-1 pt-0.5 rounded-br-lg',
        'bg-white/80 backdrop-blur-sm',
        carta.esComodin ? 'text-purple-700' : carta.esMuestra ? 'text-yellow-700' : 'text-gray-800',
      ].join(' ')}>
        <span className={['font-black', pequeña ? 'text-sm' : 'text-base'].join(' ')}>
          {carta.valor}
        </span>
        <span className={['leading-none', pequeña ? 'text-[9px]' : 'text-[10px]'].join(' ')}>
          {PALO_SHORT[carta.palo]}
        </span>
      </div>

      {/* Badge muestra / comodín — borde inferior */}
      {(carta.esMuestra || carta.esComodin) && (
        <div className={[
          'absolute bottom-0 inset-x-0 text-center font-bold leading-none py-0.5',
          pequeña ? 'text-[8px]' : 'text-[9px]',
          carta.esComodin ? 'bg-purple-600/85 text-white' : 'bg-yellow-400/90 text-yellow-900',
        ].join(' ')}>
          {carta.esComodin ? '♟ comodín' : '★ muestra'}
        </div>
      )}
    </div>
  )
}

// Carta boca abajo — siempre visible (no depende de imagen)
export function CartaDorso({ pequeña = false }: { pequeña?: boolean }) {
  const size = pequeña ? 'w-8 h-12' : 'w-14 h-20'
  return (
    <div className={[
      size,
      'rounded-xl overflow-hidden shadow relative',
    ].join(' ')}>
      {/* Intentar imagen de dorso */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cards/dorso.png"
        alt="carta tapada"
        className="w-full h-full object-cover absolute inset-0"
        draggable={false}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0' }}
      />
      {/* Fallback siempre visible detrás */}
      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
        <div className="w-3/4 h-4/5 border border-blue-400/40 rounded-lg" />
      </div>
    </div>
  )
}
