import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Truco Uruguayo Online',
  description: 'Jugá al Truco Uruguayo con la muestra, en tiempo real',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} text-white min-h-screen`}>{children}</body>
    </html>
  )
}
