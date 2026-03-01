'use client'
import { useEffect } from 'react'
import { Board } from '../../../components/game/Board'
import { getSocket } from '../../../lib/socket'
import { useGameStore } from '../../../lib/store/gameStore'

export default function GamePage({ params }: { params: { roomId: string } }) {
  const { roomId } = params
  const { setEstado } = useGameStore()

  useEffect(() => {
    const socket = getSocket()

    socket.on('PARTIDA_INICIADA', (estado) => setEstado(estado))
    socket.on('ESTADO_ACTUALIZADO', (estado) => setEstado(estado))

    return () => {
      socket.off('PARTIDA_INICIADA')
      socket.off('ESTADO_ACTUALIZADO')
    }
  }, [setEstado])

  return <Board />
}
