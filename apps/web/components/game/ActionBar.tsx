'use client'
import { getSocket } from '../../lib/socket'
import type { EstadoJuegoCliente } from '@truco/game-core'

interface ActionBarProps {
  estado: EstadoJuegoCliente
  miId: string
}

export function ActionBar({ estado, miId }: ActionBarProps) {
  const esMiTurno = estado.turnoActual === miId
  const s = getSocket()

  const { truco, envido } = estado

  const trucoPendiente = ['cantado', 'retrucado', 'vale_cuatro'].includes(truco.estado)
  const envidoPendiente = envido.estado === 'cantado'

  const puedoResponderTruco = trucoPendiente && truco.ultimoCantador !== miId && esMiTurno
  const puedoResponderEnvido = envidoPendiente && envido.ultimoCantador !== miId && esMiTurno

  return (
    <div className="flex flex-wrap gap-2 justify-center">

      {/* Truco */}
      {esMiTurno && truco.estado === 'sin_cantar' && (
        <button
          onClick={() => s.emit('CANTAR_TRUCO')}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
        >
          Truco
        </button>
      )}
      {esMiTurno && truco.estado === 'quiero' && truco.ultimoCantador !== miId && (
        <button
          onClick={() => s.emit('CANTAR_RETRUCO')}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
        >
          Retruco
        </button>
      )}
      {esMiTurno && truco.estado === 'cantado' && truco.ultimoCantador !== miId && (
        <button
          onClick={() => s.emit('CANTAR_RETRUCO')}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
        >
          Retruco
        </button>
      )}
      {esMiTurno && truco.estado === 'retrucado' && truco.ultimoCantador !== miId && (
        <button
          onClick={() => s.emit('CANTAR_VALE_CUATRO')}
          className="bg-red-800 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-lg transition-colors"
        >
          Vale 4
        </button>
      )}

      {/* Envido */}
      {esMiTurno && envido.estado === 'sin_cantar' && estado.fase === 'envido' && (
        <>
          <button
            onClick={() => s.emit('CANTAR_ENVIDO', { tipo: 'envido' })}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
          >
            Envido
          </button>
          <button
            onClick={() => s.emit('CANTAR_ENVIDO', { tipo: 'real_envido' })}
            className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-lg transition-colors"
          >
            Real Envido
          </button>
          <button
            onClick={() => s.emit('CANTAR_ENVIDO', { tipo: 'falta_envido' })}
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-5 py-2 rounded-lg transition-colors"
          >
            Falta Envido
          </button>
        </>
      )}

      {/* Flor */}
      {estado.flor.jugadoresConFlor.includes(miId) && !estado.flor.resuelta && (
        <button
          onClick={() => s.emit('CANTAR_FLOR')}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
        >
          🌸 Flor
        </button>
      )}

      {/* Quiero / No quiero — truco */}
      {puedoResponderTruco && (
        <>
          <button
            onClick={() => s.emit('QUIERO')}
            className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
          >
            ✓ Quiero
          </button>
          <button
            onClick={() => s.emit('NO_QUIERO')}
            className="bg-gray-600 hover:bg-gray-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
          >
            ✗ No quiero
          </button>
        </>
      )}

      {/* Quiero / No quiero — envido */}
      {puedoResponderEnvido && (
        <>
          <button
            onClick={() => s.emit('QUIERO')}
            className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
          >
            ✓ Quiero envido
          </button>
          <button
            onClick={() => s.emit('NO_QUIERO')}
            className="bg-gray-600 hover:bg-gray-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
          >
            ✗ No quiero
          </button>
        </>
      )}

      {/* Ir al mazo */}
      {esMiTurno && (
        <button
          onClick={() => s.emit('IR_AL_MAZO')}
          className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg transition-colors text-sm"
        >
          Ir al mazo
        </button>
      )}
    </div>
  )
}
