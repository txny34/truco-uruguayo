import type { FastifyInstance } from 'fastify'

export async function statsRoutes(fastify: FastifyInstance) {
  // GET /api/stats/perfil/:jugadorId
  fastify.get('/perfil/:jugadorId', async (req, reply) => {
    const { jugadorId } = req.params as { jugadorId: string }
    // TODO: buscar en DB
    return reply.send({
      jugadorId,
      nombre: 'Jugador',
      elo: 1000,
      partidasJugadas: 0,
      victorias: 0,
      derrotas: 0,
      racha: 0,
    })
  })

  // GET /api/stats/ranking
  fastify.get('/ranking', async (_req, reply) => {
    // TODO: buscar top 10 por ELO en DB
    return reply.send({ ranking: [] })
  })
}
