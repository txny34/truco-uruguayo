'use client'
import { useCallback, useEffect, useState } from 'react'
import { useGameStore } from '../../lib/store/gameStore'
import { getSocket } from '../../lib/socket'
import { Hand } from './Hand'
import { Muestra } from './Muestra'
import { ActionBar } from './ActionBar'
import { ScoreBoard } from './ScoreBoard'
import { SeñasPanel } from './SeñasPanel'
import { SeñaOverlay, type SeñaRecibida } from './SeñaOverlay'
import { CartaImg, CartaDorso } from './CartaImg'
import type { JugadorCliente, Carta } from '@truco/game-core'

// Placeholder vacío (espacio donde irá una carta)
function SlotVacioMesa() {
  return (
    <div className="w-14 h-20 rounded-xl border-2 border-dashed border-white/10" />
  )
}

// Indicador de turno
function TurnoChip({ nombre }: { nombre: string }) {
  return (
    <div className="inline-flex items-center gap-1 bg-yellow-400/20 border border-yellow-400 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
      ● {nombre} juega
    </div>
  )
}

// Zona de un jugador oponente (top / left / right)
function ZonaOponente({
  jugador,
  esTurno,
}: {
  jugador: JugadorCliente
  cartaJugada: Carta | null   // mantenido por compatibilidad, cartas van a la mesa central
  esTurno: boolean
  orientacion: 'top' | 'left' | 'right'
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Nombre + equipo */}
      <div className={[
        'flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold shadow',
        esTurno ? 'bg-yellow-400 text-black' : 'bg-black/50 text-green-300',
      ].join(' ')}>
        <span>{jugador.esBot ? '🤖' : '👤'}</span>
        <span>{jugador.nombre}</span>
        <span className="opacity-50 text-[10px]">E{jugador.equipo}</span>
      </div>

      {/* Cartas boca abajo */}
      <div className="flex gap-1.5">
        {Array.from({ length: jugador.cantidadCartas }).map((_, i) => (
          <CartaDorso key={i} pequeña />
        ))}
        {jugador.cantidadCartas === 0 && (
          <span className="text-green-700 text-xs italic">sin cartas</span>
        )}
      </div>
    </div>
  )
}

// ── ELO update ────────────────────────────────────────────────
interface EloUpdate { eloAntes: number; eloNuevo: number; delta: number }

// ── BOARD PRINCIPAL ───────────────────────────────────────────
export function Board() {
  const { estado, miId } = useGameStore()
  const [señaActual, setSeñaActual] = useState<SeñaRecibida | null>(null)
  const [eloUpdate, setEloUpdate] = useState<EloUpdate | null>(null)

  useEffect(() => {
    const socket = getSocket()
    socket.on('SEÑA_RECIBIDA', (data: SeñaRecibida) => setSeñaActual(data))
    socket.on('ELO_ACTUALIZADO', (data: EloUpdate) => setEloUpdate(data))
    return () => { socket.off('SEÑA_RECIBIDA'); socket.off('ELO_ACTUALIZADO') }
  }, [])

  const dismissSeña = useCallback(() => setSeñaActual(null), [])

  // ── Loading ────────────────────────────────────────────────
  if (!estado || !miId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🃏</div>
          <p className="text-green-300">Esperando jugadores...</p>
        </div>
      </div>
    )
  }

  // ── Fin de partida ─────────────────────────────────────────
  if (estado.fase === 'fin_partida') {
    const ganador = estado.puntaje.equipo1 >= estado.puntajeMaximo ? 1 : 2
    const yo = estado.jugadores.find((j) => j.id === miId)
    const gane = yo?.equipo === ganador
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-slide-arriba">
          <div className="text-6xl mb-4">{gane ? '🏆' : '😤'}</div>
          <h2 className="text-3xl font-black text-white mb-2">{gane ? '¡Ganaste!' : '¡Perdiste!'}</h2>
          <p className="text-green-400 mb-3">{estado.puntaje.equipo1} — {estado.puntaje.equipo2}</p>
          {eloUpdate && (
            <div className={[
              'mx-auto mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm',
              eloUpdate.delta >= 0 ? 'bg-green-900/60 border-green-500 text-green-300' : 'bg-red-900/60 border-red-500 text-red-300',
            ].join(' ')}>
              <span>ELO</span>
              <span className="text-white">{eloUpdate.eloAntes}</span>
              <span>→</span>
              <span className="text-white font-black">{eloUpdate.eloNuevo}</span>
              <span className={eloUpdate.delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                ({eloUpdate.delta >= 0 ? '+' : ''}{eloUpdate.delta})
              </span>
            </div>
          )}
          <button onClick={() => (window.location.href = '/lobby')}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 px-8 rounded-2xl text-lg transition-colors">
            Jugar de nuevo
          </button>
        </div>
      </div>
    )
  }

  // ── Fin de mano ────────────────────────────────────────────
  if (estado.fase === 'fin_mano') {
    const ganador = estado.ganadorRonda
    const yo = estado.jugadores.find((j) => j.id === miId)
    const gane = yo?.equipo === ganador
    return (
      <div className="flex flex-col min-h-screen bg-green-900">
        <ScoreBoard puntaje={estado.puntaje} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-green-800/80 border border-green-700 rounded-2xl p-8 mx-4 animate-slide-arriba">
            <div className="text-5xl mb-3">{gane ? '🎉' : '😮'}</div>
            <h2 className="text-2xl font-black text-white mb-1">{gane ? '¡Ganaste la mano!' : 'Perdiste la mano'}</h2>
            <p className="text-green-400 text-sm mb-6">Mano {estado.manoActual} · {estado.puntaje.equipo1} — {estado.puntaje.equipo2}</p>
            <button onClick={() => getSocket().emit('SIGUIENTE_MANO')}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 px-8 rounded-2xl text-lg transition-colors">
              Siguiente mano →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Juego en curso ─────────────────────────────────────────
  const yo = estado.jugadores.find((j) => j.id === miId)!
  const myIdx = estado.jugadores.findIndex((j) => j.id === miId)
  const n = estado.jugadores.length

  // Posiciones alrededor de la mesa (desde mi perspectiva, en sentido horario)
  const jugadorTop = estado.jugadores[(myIdx + Math.floor(n / 2)) % n]
  const jugadorRight = n === 4 ? estado.jugadores[(myIdx + 1) % n] : null
  const jugadorLeft = n === 4 ? estado.jugadores[(myIdx + 3) % n] : null

  // Cartas jugadas este turno (indexed por jugadorId)
  const cartasEnMesa = new Map<string, Carta>()
  for (const cm of estado.mesa) {
    cartasEnMesa.set(cm.jugadorId, cm.carta)
  }

  const tieneCompañero = estado.jugadores.filter(
    (j) => j.equipo === yo.equipo && j.id !== miId
  ).length > 0

  const turnoActual = estado.jugadores.find((j) => j.id === estado.turnoActual)

  return (
    <div className="h-screen bg-green-900 flex flex-col select-none overflow-hidden">
      <SeñaOverlay seña={señaActual} onDismiss={dismissSeña} />
      <ScoreBoard puntaje={estado.puntaje} />

      {/* ── Mesa: 3 filas fijas ───────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* ── FILA 1: oponente arriba (~30%) ────────────── */}
        <div className="flex justify-center items-start pt-3 px-4" style={{ minHeight: '30%' }}>
          <ZonaOponente
            jugador={jugadorTop}
            cartaJugada={cartasEnMesa.get(jugadorTop.id) ?? null}
            esTurno={estado.turnoActual === jugadorTop.id}
            orientacion="top"
          />
        </div>

        {/* ── FILA 2: centro — muestra + cartas jugadas ─── */}
        <div className="flex items-center justify-center gap-4 px-4 py-2">

          {jugadorLeft && (
            <ZonaOponente
              jugador={jugadorLeft}
              cartaJugada={cartasEnMesa.get(jugadorLeft.id) ?? null}
              esTurno={estado.turnoActual === jugadorLeft.id}
              orientacion="left"
            />
          )}

          {/* Muestra + turno + cartas en mesa */}
          <div className="flex flex-col items-center gap-2">
            <Muestra muestra={estado.muestra} />

            {turnoActual && (
              <TurnoChip nombre={turnoActual.id === miId ? 'Vos' : turnoActual.nombre} />
            )}

            {/* Cartas jugadas esta baza */}
            {estado.mesa.length > 0 && (
              <div className="flex gap-3 mt-1 items-end">
                {estado.jugadores.map((j) => {
                  const carta = cartasEnMesa.get(j.id)
                  if (!carta) return null
                  const esYo = j.id === miId
                  return (
                    <div
                      key={`${j.id}-${carta.valor}-${carta.palo}`}
                      className="flex flex-col items-center gap-1 animate-carta-mesa"
                      style={{ animationFillMode: 'both' }}
                    >
                      <span className={[
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        esYo ? 'bg-blue-500/40 text-blue-200' : 'bg-orange-500/40 text-orange-200',
                      ].join(' ')}>
                        {esYo ? 'Vos' : j.nombre}
                      </span>
                      <div style={{ rotate: esYo ? '-4deg' : '4deg' }}>
                        <CartaImg pequeña carta={carta} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {jugadorRight && (
            <ZonaOponente
              jugador={jugadorRight}
              cartaJugada={cartasEnMesa.get(jugadorRight.id) ?? null}
              esTurno={estado.turnoActual === jugadorRight.id}
              orientacion="right"
            />
          )}
        </div>

        {/* ── FILA 3: mi zona (~40%) ─────────────────────── */}
        <div className="flex flex-col items-center gap-3 px-4 pb-3 mt-auto">

          {/* Mi nombre */}
          <div className={[
            'flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold',
            estado.turnoActual === miId ? 'bg-yellow-400 text-black' : 'bg-black/40 text-green-300',
          ].join(' ')}>
            <span>👤</span>
            <span>{yo.nombre}</span>
            <span className="opacity-50 text-[10px]">E{yo.equipo}</span>
          </div>

          {/* Mi mano */}
          <Hand cartas={yo.mano} />

          {/* Action bar + señas */}
          <div className="flex flex-wrap gap-2 justify-center">
            <ActionBar estado={estado} miId={miId} />
            <SeñasPanel tieneCompañero={tieneCompañero} mano={yo.mano} />
          </div>
        </div>
      </div>
    </div>
  )
}
