import type { Socket } from 'socket.io'

// Middleware que verifica JWT antes de conectar el socket
export function authMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token

  if (!token) {
    // Permitir sin auth en desarrollo
    if (process.env.NODE_ENV === 'development') return next()
    return next(new Error('No autorizado — falta token'))
  }

  // TODO: verificar JWT con fastify.jwt o jsonwebtoken
  next()
}
