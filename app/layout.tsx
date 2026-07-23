import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: 'Strudl',
  description: 'Eine Karte. Jedes Kaffeehaus. Digitale Kundenbindung für unabhängige Kaffeehäuser in Wien.',
  icons: { icon: '/strudl-cafes-platform/Logo_Strudl_no_Background.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  )
}
