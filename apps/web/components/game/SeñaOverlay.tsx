'use client'
import { useEffect, useState } from 'react'
import type { TipoSeña } from '@truco/game-core'

export interface SeñaRecibida {
  de: string
  nombre: string
  tipo: TipoSeña
}

export const SEÑAS_CONFIG: Record<TipoSeña, { emoji: string; label: string; color: string }> = {
  levantar_cejas:   { emoji: '🤨', label: 'Levantar cejas',    color: 'border-yellow-400 bg-yellow-900/90' },
  beso:             { emoji: '😘', label: 'Beso',               color: 'border-pink-400 bg-pink-900/90' },
  arrugar_nariz:    { emoji: '😤', label: 'Arrugar nariz',      color: 'border-orange-400 bg-orange-900/90' },
  guino_derecho:    { emoji: '😉', label: 'Guiño ojo derecho',  color: 'border-blue-400 bg-blue-900/90' },
  guino_izquierdo:  { emoji: '😜', label: 'Guiño ojo izquierdo', color: 'border-cyan-400 bg-cyan-900/90' },
  mueca_derecha:    { emoji: '😏', label: 'Mueca labios der.',  color: 'border-red-400 bg-red-900/90' },
  mueca_izquierda:  { emoji: '🫤', label: 'Mueca labios izq.',  color: 'border-rose-400 bg-rose-900/90' },
  morder_labio:     { emoji: '😬', label: 'Morder labio',       color: 'border-green-400 bg-green-900/90' },
  boca_abierta:     { emoji: '😮', label: 'Boca abierta',       color: 'border-teal-400 bg-teal-900/90' },
  sacar_lengua:     { emoji: '😛', label: 'Sacar la lengua',    color: 'border-lime-400 bg-lime-900/90' },
  ojos_cerrados:    { emoji: '😑', label: 'Ojos cerrados',      color: 'border-gray-400 bg-gray-800/90' },
}

interface Props {
  seña: SeñaRecibida | null
  onDismiss: () => void
}

export function SeñaOverlay({ seña, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!seña) { setVisible(false); return }

    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 3000)

    return () => clearTimeout(timer)
  }, [seña, onDismiss])

  if (!seña) return null

  const cfg = SEÑAS_CONFIG[seña.tipo] ?? { emoji: '🤫', label: seña.tipo, color: 'border-white/20 bg-black/80' }

  return (
    <div
      className={[
        'fixed top-20 left-1/2 -translate-x-1/2 z-50',
        'flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-2 shadow-2xl',
        'transition-all duration-300',
        cfg.color,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4',
      ].join(' ')}
      style={{ pointerEvents: 'none' }}
    >
      <div className="text-xs text-white/60 uppercase tracking-widest">{seña.nombre} te señó</div>
      <div className="text-4xl leading-none">{cfg.emoji}</div>
      <div className="text-white font-bold text-sm">{cfg.label}</div>
    </div>
  )
}
