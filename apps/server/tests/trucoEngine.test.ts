import { describe, it, expect } from 'vitest'
import { TrucoEngine } from '../src/game/TrucoEngine'

const jugadoresBase = [
  { id: 'j1', nombre: 'Ana', equipo: 1 as const },
  { id: 'j2', nombre: 'Bruno', equipo: 2 as const },
  { id: 'j3', nombre: 'Carla', equipo: 1 as const },
  { id: 'j4', nombre: 'Diego', equipo: 2 as const },
]

describe('TrucoEngine', () => {
  it('reparte 3 cartas a cada jugador', () => {
    const engine = new TrucoEngine('sala-test', jugadoresBase)
    const estado = engine.repartir()
    for (const jugador of estado.jugadores) {
      expect(jugador.mano.length).toBe(3)
    }
  })

  it('establece la muestra correctamente', () => {
    const engine = new TrucoEngine('sala-test', jugadoresBase)
    const estado = engine.repartir()
    expect(estado.muestra).not.toBeNull()
    expect(estado.muestra?.palo).toMatch(/espadas|bastos|oros|copas/)
  })

  it('detecta cartas muestras correctamente', () => {
    const engine = new TrucoEngine('sala-test', jugadoresBase)
    const estado = engine.repartir()
    const palMuestra = estado.muestra!.palo
    for (const jugador of estado.jugadores) {
      for (const carta of jugador.mano) {
        if (carta.palo === palMuestra && [2, 4, 5, 10, 11].includes(carta.valor)) {
          expect(carta.esMuestra).toBe(true)
        }
      }
    }
  })

  it('detecta flor con dos muestras', () => {
    const engine = new TrucoEngine('sala-test', jugadoresBase)
    const tieneFlor = engine.tieneFlorEnMano([
      { valor: 2, palo: 'oros', esMuestra: true, esComodin: false },
      { valor: 4, palo: 'oros', esMuestra: true, esComodin: false },
      { valor: 3, palo: 'espadas', esMuestra: false, esComodin: false },
    ])
    expect(tieneFlor).toBe(true)
  })
})
