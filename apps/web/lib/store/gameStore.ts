import { create } from 'zustand'
import type { EstadoJuegoCliente } from '@truco/game-core'

interface GameStore {
  estado: EstadoJuegoCliente | null
  salaId: string | null
  miId: string | null
  setEstado: (estado: EstadoJuegoCliente) => void
  setSala: (salaId: string, miId: string) => void
  resetear: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  estado: null,
  salaId: null,
  miId: null,
  setEstado: (estado) => set({ estado }),
  setSala: (salaId, miId) => set({ salaId, miId }),
  resetear: () => set({ estado: null, salaId: null, miId: null }),
}))
