import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { PwaRegister } from '@/components/pwa-register'
import { InstallPrompt } from '@/components/install-prompt'
import { NativeApp } from '@/components/native-app'
import { APPLE_STARTUP_IMAGES } from '@/lib/apple-startup-images'
import './globals.css'

const geist = Geist({ variable: '--font-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  applicationName: 'Mon Budget',
  title: 'Mon Budget',
  description: 'Ton suivi de budget quotidien',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Mon Budget',
    // 'default' : la barre d'état iOS reprend le fond de l'app (beige clair)
    // avec du texte noir lisible. 'black-translucent' donnerait du texte
    // blanc illisible sur ce thème clair.
    statusBarStyle: 'default',
    startupImage: APPLE_STARTUP_IMAGES,
  },
  // Empêche iOS de transformer les montants / dates en liens tap-ables
  // (« 12,50 » devenait un lien téléphone bleu : le réflexe page web).
  formatDetection: { telephone: false, date: false, address: false, email: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#FAF6F1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* Next n'émet que `mobile-web-app-capable`. iOS < 17 a besoin de la
            variante préfixée pour ouvrir l'app en plein écran : on l'ajoute
            à la main, c'est elle qui supprime la barre Safari. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <NativeApp />
        <PwaRegister />
        <InstallPrompt />
        {children}
      </body>
    </html>
  )
}
