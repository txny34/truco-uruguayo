import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const RegisterSchema = z.object({
  nombre: z.string().min(2).max(30),
  email: z.string().email(),
  password: z.string().min(6),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post('/register', async (req, reply) => {
    const body = RegisterSchema.parse(req.body)
    const hash = await bcrypt.hash(body.password, 10)

    // TODO: guardar en DB con Prisma
    // const user = await prisma.user.create({ data: { ...body, password: hash } })

    const token = fastify.jwt.sign({
      sub: 'user-id-placeholder',
      nombre: body.nombre,
      email: body.email,
    })

    return reply.status(201).send({ token, nombre: body.nombre })
  })

  // POST /api/auth/login
  fastify.post('/login', async (req, reply) => {
    const body = LoginSchema.parse(req.body)

    // TODO: buscar en DB, verificar password con bcrypt.compare
    const token = fastify.jwt.sign({ sub: 'user-id', email: body.email })

    return reply.send({ token })
  })

  // GET /api/auth/me
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    return reply.send({ user: req.user })
  })
}
