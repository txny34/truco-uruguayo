'use client'
import { useState } from 'react'
import { getSocket } from '../../lib/socket'
import { getSeñaCarta } from '@truco/game-core'
import type { Carta, TipoSeña } from '@truco/game-core'
import { SEÑAS_CONFIG } from './SeñaOverlay'

const PALO_SHORT: Record<string, string> = {
  espadas: 'Esp', bastos: 'Bas', oros: 'Oro', copas: 'Cop',
}

interface Props {
  tieneCompañero: boolean
  mano: Carta[]
}

export function SeñasPanel({ tieneCompañero, mano }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [ultima, setUltima] = useState<TipoSeña | null>(null)

  if (!tieneCompañero) return null

  // Cartas que tienen seña asignada
  const cartasConSeña = mano
    .map((c) => ({ carta: c, tipo: getSeñaCarta(c.valor, c.palo, c.esMuestra, c.esComodin) }))
    .filter((x): x is { carta: Carta; tipo: TipoSeña } => x.tipo !== null)

  if (cartasConSeña.length === 0) return null

  const enviar = (tipo: TipoSeña) => {
    getSocket().emit('ENVIAR_SEÑA', { tipo })
    setUltima(tipo)
    setAbierto(false)
    setTimeout(() => setUltima(null), 1500)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((o) => !o)}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all',
          ultima
            ? 'bg-purple-700 border-purple-500 text-white'
            : 'bg-purple-900/60 border-purple-700 text-purple-300 hover:bg-purple-800/60 hover:text-white',
        ].join(' ')}
        title="Hacer una seña a tu compañero"
      >
        <span>🤫</span>
        <span>{ultima ? `${SEÑAS_CONFIG[ultima].emoji} Señado ✓` : 'Señas'}</span>
      </button>

      {abierto && (
        <div className="absolute bottom-full mb-2 left-0 bg-green-950 border border-green-700 rounded-2xl p-3 shadow-2xl z-40 min-w-[200px]">
          <p className="text-green-500 text-xs uppercase tracking-widest mb-2 text-center">
            Solo tu compañero lo ve
          </p>
          <div className="flex flex-col gap-2">
            {cartasConSeña.map(({ carta, tipo }) => {
              const cfg = SEÑAS_CONFIG[tipo]
              return (
                <button
                  key={`${carta.valor}_${carta.palo}`}
                  onClick={() => enviar(tipo)}
                  className="flex items-center gap-3 bg-green-900/60 hover:bg-green-800 border border-green-700 rounded-xl px-3 py-2 transition-colors text-left"
                >
                  {/* Mini carta */}
                  <div className={[
                    'flex flex-col items-center justify-center w-8 h-10 rounded-lg border-2 text-xs font-black flex-shrink-0',
                    carta.esComodin
                      ? 'border-purple-400 text-purple-300 bg-purple-900/60'
                      : carta.esMuestra
                      ? 'border-yellow-400 text-yellow-300 bg-yellow-900/60'
                      : 'border-white/30 text-white bg-white/10',
                  ].join(' ')}>
                    <span>{carta.valor}</span>
                    <span className="text-[9px] opacity-70">{PALO_SHORT[carta.palo]}</span>
                  </div>
                  {/* Seña */}
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xl leading-none">{cfg.emoji}</span>
                    <span className="text-white text-xs font-semibold leading-tight">{cfg.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setAbierto(false)}
            className="mt-2 w-full text-green-600 text-xs text-center hover:text-green-400 transition-colors"
          >
            cerrar
          </button>
        </div>
      )}
    </div>
  )
}
