import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Truco Uruguayo Online',
  description: 'Jugá al Truco Uruguayo con la muestra, en tiempo real',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-green-950 text-white min-h-screen">{children}</body>
    </html>
  )
}
