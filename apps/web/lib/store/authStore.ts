import { create } from 'zustand'

interface AuthStore {
  token: string | null
  nombre: string | null
  jugadorId: string | null
  login: (token: string, nombre: string, jugadorId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  nombre: null,
  jugadorId: null,
  login: (token, nombre, jugadorId) => set({ token, nombre, jugadorId }),
  logout: () => set({ token: null, nombre: null, jugadorId: null }),
}))
