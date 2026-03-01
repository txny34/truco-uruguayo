import Fastify from 'fastify'
import { Server } from 'socket.io'
import { createServer } from 'http'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { setupSocketHandlers } from './socket/handlers/gameHandler'
import { authRoutes } from './api/auth'
import { statsRoutes } from './api/stats'

const fastify = Fastify({ logger: true })
const httpServer = createServer(fastify.server)

// WebSocket server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

async function start() {
  // Plugins
  await fastify.register(cors, { origin: true })
  await fastify.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' })

  // REST Routes
  fastify.register(authRoutes, { prefix: '/api/auth' })
  fastify.register(statsRoutes, { prefix: '/api/stats' })

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // WebSocket handlers
  setupSocketHandlers(io)

  // Start
  const port = Number(process.env.PORT) || 3001
  httpServer.listen({ port, host: '0.0.0.0' }, () => {
    console.log(`🃏 Servidor Truco Uruguayo corriendo en http://localhost:${port}`)
  })
}

start()
