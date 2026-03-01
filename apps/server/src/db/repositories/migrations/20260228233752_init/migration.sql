-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "elo" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partidas" (
    "id" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "ganadorEquipo" INTEGER NOT NULL,
    "puntajeEq1" INTEGER NOT NULL,
    "puntajeEq2" INTEGER NOT NULL,
    "duracion" INTEGER NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partida_jugadores" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equipo" INTEGER NOT NULL,

    CONSTRAINT "partida_jugadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jugadas" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dato" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jugadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "partida_jugadores" ADD CONSTRAINT "partida_jugadores_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "partidas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partida_jugadores" ADD CONSTRAINT "partida_jugadores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jugadas" ADD CONSTRAINT "jugadas_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "partidas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
