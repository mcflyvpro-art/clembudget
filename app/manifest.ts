import type { MetadataRoute } from 'next'

/**
 * Manifeste PWA — servi sur /manifest.webmanifest
 *
 * Il doit rester accessible SANS session (voir le matcher de proxy.ts) :
 * Safari le télécharge sans cookies et l'ignore s'il reçoit une redirection.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Mon Budget',
    short_name: 'Budget',
    description: 'Ton suivi de budget quotidien',
    lang: 'fr',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#FAF6F1',
    theme_color: '#FAF6F1',
    orientation: 'portrait',
    categories: ['finance', 'productivity', 'lifestyle'],
    prefer_related_applications: false,
    launch_handler: { client_mode: 'navigate-existing' },
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      {
        name: 'Ajouter une dépense',
        short_name: 'Ajouter',
        url: '/?add=1',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Statistiques',
        short_name: 'Stats',
        url: '/stats',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Objectifs',
        short_name: 'Objectifs',
        url: '/objectifs',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  }
}
