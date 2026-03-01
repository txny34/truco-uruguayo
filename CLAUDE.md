# CLAUDE.md

Este archivo le da contexto a Claude Code (claude.ai/code) para trabajar en este repositorio.

## Comandos

```bash
# Instalar todas las dependencias (desde la raíz)
npm install

# Levantar todos los apps en modo desarrollo (Turborepo orquesta ambos)
npm run dev           # web en :3000 y server en :3001

# Compilar todos los paquetes y apps
npm run build

# Correr tests (solo el server tiene tests; usa Vitest)
npm run test

# Correr tests solo del server
cd apps/server && npx vitest run

# Correr un único archivo de tests
cd apps/server && npx vitest run tests/trucoEngine.test.ts

# Lint
npm run lint

# Configuración de la base de datos (requiere Docker corriendo)
docker compose up -d                          # levanta PostgreSQL + Redis
cd apps/server && npx prisma migrate dev      # aplica migraciones
cd apps/server && npx prisma studio           # abre la GUI de la BD
```

## Variables de entorno

Copiar `.env.example` a `.env` antes de correr localmente. Variables clave:
- `DATABASE_URL` — cadena de conexión a PostgreSQL
- `REDIS_URL` — cadena de conexión a Redis
- `JWT_SECRET` — cambiar en producción
- `NEXT_PUBLIC_WS_URL` — URL del WebSocket para el frontend (por defecto `ws://localhost:3001`)

## Arquitectura

Es un **monorepo con Turborepo** con tres paquetes:

```
apps/web/           → Frontend Next.js 14 (puerto 3000)
apps/server/        → Backend Fastify + Socket.io (puerto 3001)
packages/game-core/ → Lógica del juego compartida (importada por ambos apps)
```

### `packages/game-core` — dominio compartido

Todos los tipos (`EstadoJuego`, `Carta`, `Jugador`, `TipoEvento`, etc.) y funciones puras del juego viven acá. Ambos apps importan desde `@truco/game-core`. **Nunca poner código de UI o de red aquí.**

Exports principales:
- `types.ts` — tipos del dominio. `EstadoJuego` es la forma autoritativa del estado del juego. `EstadoJuegoCliente` es la vista filtrada que se envía a cada jugador (las cartas de los oponentes se enmascaran con `oculta: true`).
- `constants.ts` — `getRankTruco()` (ranking de cartas para el truco incluyendo muestras y comodín) y `getValorEnvido()`.
- `validators.ts` — `esAccionValida()`, que verifica si la acción de un jugador es legal dado el `EstadoJuego` actual. **Toda la validación corre solo en el servidor.**

### `apps/server` — backend

- **`src/index.ts`**: Bootstrap de Fastify + Socket.io. Rutas REST en `/api/auth` y `/api/stats`; handlers WebSocket configurados con `setupSocketHandlers(io)`.
- **`src/game/TrucoEngine.ts`**: Clase con estado que mantiene una instancia de `EstadoJuego`. Maneja el reparto (`repartir()`), detección de flor, cálculo de envido y evaluación de ronda (`evaluarRonda()`). Una instancia por sala.
- **`src/game/RoomManager.ts`**: Registro en memoria de las salas activas (`Map<salaId, Sala>`). Mapea socket IDs a sala IDs para manejar desconexiones. **Nota**: el comentario en el archivo indica reemplazar con Redis en producción.
- **`src/socket/handlers/gameHandler.ts`**: Todos los handlers de eventos Socket.io. `filtrarEstado()` elimina los valores de las cartas de los oponentes antes de difundir el estado. Valida acciones con `esAccionValida()` antes de aplicarlas.
- **`src/db/repositories/schema.prisma`**: Schema de PostgreSQL — `User`, `Partida`, `PartidaJugador`, `Jugada`.

### `apps/web` — frontend

- **`lib/socket.ts`**: Cliente Socket.io singleton (lazy-initialized, `autoConnect: false`).
- **`lib/store/gameStore.ts`** y **`lib/store/authStore.ts`**: Stores de Zustand para el estado del juego y autenticación.
- **`app/game/[roomId]/page.tsx`**: Ruta dinámica para la mesa de juego.
- **`components/game/`**: Componentes Board, Hand, Mesa, Muestra, ActionBar, ScoreBoard.

### Flujo de datos

```
Acción del cliente → socket.emit(TipoEvento)
  → gameHandler valida con esAccionValida()
  → TrucoEngine muta EstadoJuego
  → filtrarEstado() se aplica por jugador
  → io.to(salaId).emit() difunde el estado filtrado
  → gameStore.setEstado() actualiza Zustand
  → React re-renderiza
```

### Reglas del juego codificadas

- La **muestra** (carta expuesta en el índice 12 del mazo) determina qué cartas son muestras (valores 2, 4, 5, 10, 11 de ese palo) y si el Rey de ese palo es comodín.
- El **comodín** (Rey del palo muestra) solo se activa cuando la carta muestra descubierta es en sí misma un valor especial (uno de `VALORES_MUESTRA`).
- La **flor** se detecta automáticamente al repartir: 2+ cartas especiales, o 1 especial + 2 normales del mismo palo, o 3 normales del mismo palo.
- Ranking de cartas para el truco: muestras > matas (bravas) > cartas normales — ver `getRankTruco()` para el orden completo.
