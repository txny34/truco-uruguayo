'use client'
import Link from 'next/link'

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <h1 className="text-3xl font-bold text-yellow-400">Mi Perfil</h1>
      <div className="bg-green-800 rounded-2xl p-6 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🎴</div>
          <p className="text-xl font-bold">Jugador</p>
          <p className="text-green-400 text-sm">ELO: 1000</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-yellow-400">0</div>
            <div className="text-xs text-green-400">Partidas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">0</div>
            <div className="text-xs text-green-400">Victorias</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">0</div>
            <div className="text-xs text-green-400">Derrotas</div>
          </div>
        </div>
      </div>
      <Link href="/" className="text-green-400 hover:text-green-300 transition-colors">← Volver</Link>
    </div>
  )
}
