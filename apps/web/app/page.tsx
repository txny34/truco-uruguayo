import Link from 'next/link'

const FEATURES = [
  {
    icon: '🃏',
    title: 'La muestra',
    desc: 'La carta descubierta en el mazo define las muestras y activa el comodín del palo.',
  },
  {
    icon: '🌸',
    title: 'Flor automática',
    desc: 'El sistema detecta tu flor al repartir. Solo te queda cantarla.',
  },
  {
    icon: '⚡',
    title: 'Tiempo real',
    desc: 'Sin recarga ni esperas. Cada jugada llega al instante con WebSockets.',
  },
]

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-md bg-black/10">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">🃏</span>
          <span className="font-bold text-white tracking-tight">Truco Uruguayo</span>
        </div>
        <Link
          href="/profile"
          className="text-green-400 hover:text-white text-sm font-medium transition-colors"
        >
          Mi perfil
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center flex-1 text-center px-6 pt-32 pb-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-green-900/50 border border-green-700/50 rounded-full px-4 py-1.5 text-sm text-green-300 mb-10">
          <span>🇺🇾</span>
          <span>Multijugador en tiempo real</span>
        </div>

        {/* Título */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 max-w-3xl">
          Jugá al truco<br />
          <span className="text-yellow-400">como se juega</span><br />
          de verdad.
        </h1>

        {/* Subtítulo */}
        <p className="text-green-300/80 text-lg max-w-md mb-12 leading-relaxed">
          Con muestras, comodín y flor detectada automáticamente.
          Armá la mesa con tus amigos y cantá truco en tiempo real.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            href="/lobby"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 px-10 rounded-2xl text-lg transition-all hover:scale-[1.02] shadow-xl shadow-yellow-500/20"
          >
            Crear partida →
          </Link>
          <Link
            href="/lobby"
            className="border border-green-700 hover:border-green-500 text-green-300 hover:text-white font-semibold py-4 px-10 rounded-2xl text-lg transition-colors bg-green-900/20"
          >
            Unirse con código
          </Link>
        </div>

        {/* Chips de características */}
        <div className="flex flex-wrap justify-center gap-3">
          {['🃏 Con la muestra', '🌸 Con flor', '⚡ Tiempo real', '👥 2 a 4 jugadores'].map((f) => (
            <span
              key={f}
              className="bg-white/5 border border-white/10 text-green-400 text-sm px-4 py-1.5 rounded-full"
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-4xl mx-auto w-full px-6 pb-24 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 hover:border-green-700/50 transition-colors"
          >
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
            <p className="text-green-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-green-800 text-sm">🇺🇾 Hecho con amor en Uruguay</p>
      </footer>

    </div>
  )
}
