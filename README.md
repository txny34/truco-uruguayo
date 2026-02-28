# 🃏 Truco Uruguayo Online

Juego de Truco Uruguayo en tiempo real con soporte completo para **la muestra**, señas, flor, envido y truco.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 + React + Tailwind + Zustand |
| Backend | Node.js + Fastify + Socket.io |
| Base de datos | PostgreSQL (Prisma ORM) |
| Cache / Tiempo real | Redis |
| Infra local | Docker Compose |

## Estructura

```
truco-uruguayo/
├── apps/
│   ├── web/          → Frontend Next.js
│   └── server/       → Backend Node.js + Socket.io
└── packages/
    └── game-core/    → Lógica del juego (compartida)
```

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Levantar base de datos local
docker compose up -d

# 4. Migrar base de datos
cd apps/server && npx prisma migrate dev

# 5. Correr en desarrollo
npm run dev
```

## Reglas implementadas

- ✅ Mazo uruguayo (40 cartas)
- ✅ La Muestra y sus valores especiales
- ✅ El Comodín (Rey del palo muestra)
- ✅ Ranking de cartas para el truco
- ✅ Cálculo de envido con muestras
- ✅ Detección automática de flor
- ✅ WebSockets en tiempo real
- 🔲 Señas animadas (próximamente)
- 🔲 Matchmaking / Ranking ELO
