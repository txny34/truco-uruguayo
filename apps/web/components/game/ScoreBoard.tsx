'use client'

interface ScoreBoardProps {
  puntaje: { equipo1: number; equipo2: number }
}

export function ScoreBoard({ puntaje }: ScoreBoardProps) {
  return (
    <div className="flex justify-between items-center px-6 py-3 bg-green-950/60 backdrop-blur border-b border-green-800">
      <div className="text-center">
        <div className="text-xs text-green-400 uppercase tracking-wider">Equipo 1</div>
        <div className="text-3xl font-bold text-yellow-400">{puntaje.equipo1}</div>
      </div>
      <div className="text-green-500 text-2xl">vs</div>
      <div className="text-center">
        <div className="text-xs text-green-400 uppercase tracking-wider">Equipo 2</div>
        <div className="text-3xl font-bold text-yellow-400">{puntaje.equipo2}</div>
      </div>
    </div>
  )
}
