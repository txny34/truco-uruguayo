import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-yellow-400 mb-2">🃏 Truco Uruguayo</h1>
        <p className="text-green-300 text-lg">Con la muestra · En tiempo real</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/lobby"
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-xl text-center text-lg transition-colors"
        >
          Jugar ahora
        </Link>
        <Link
          href="/profile"
          className="bg-green-700 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-center text-lg transition-colors"
        >
          Mi perfil
        </Link>
      </div>
    </main>
  )
}
