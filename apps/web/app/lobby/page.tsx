'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSocket } from '../../lib/socket'
import { useGameStore } from '../../lib/store/gameStore'

export default function LobbyPage() {
  const router = useRouter()
  const { setSala } = useGameStore()
  const [nombre, setNombre] = useState('')
  const [codigoSala, setCodigoSala] = useState('')

  const crearSala = () => {
    if (!nombre.trim()) return
    const socket = getSocket()
    socket.connect()
    socket.emit('CREAR_SALA', { nombre, equipo: 1 })
    socket.once('SALA_CREADA', ({ salaId }: { salaId: string }) => {
      setSala(salaId, socket.id!)
      router.push(`/game/${salaId}`)
    })
  }

  const unirseASala = () => {
    if (!nombre.trim() || !codigoSala.trim()) return
    const socket = getSocket()
    socket.connect()
    socket.emit('UNIRSE_SALA', { salaId: codigoSala.toUpperCase(), nombre, equipo: 2 })
    setSala(codigoSala.toUpperCase(), socket.id!)
    router.push(`/game/${codigoSala.toUpperCase()}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-3xl font-bold text-yellow-400">Lobby</h1>

      <input
        type="text"
        placeholder="Tu nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="bg-green-800 border border-green-600 rounded-lg px-4 py-3 text-white placeholder-green-400 w-full max-w-xs"
      />

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={crearSala}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl transition-colors"
        >
          Crear sala nueva
        </button>

        <div className="text-center text-green-400">— o —</div>

        <input
          type="text"
          placeholder="Código de sala"
          value={codigoSala}
          onChange={(e) => setCodigoSala(e.target.value)}
          className="bg-green-800 border border-green-600 rounded-lg px-4 py-3 text-white placeholder-green-400 text-center uppercase tracking-widest"
          maxLength={6}
        />
        <button
          onClick={unirseASala}
          className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Unirse con código
        </button>
      </div>
    </div>
  )
}
