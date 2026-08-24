/**
 * Écrans de démarrage iOS (apple-touch-startup-image).
 *
 * Sans ces images, lancer l'app depuis l'écran d'accueil affiche une page
 * blanche pendant le chargement — le signe le plus évident qu'on est sur un
 * site web. Avec elles, iOS affiche un vrai launch screen au logo, comme une
 * app native.
 *
 * Chaque image doit faire exactement (largeur CSS × DPR) par (hauteur CSS × DPR).
 * Fichiers générés dans public/splash/.
 */
export const APPLE_STARTUP_IMAGES: { url: string; media: string }[] = [
  // iPhone SE / 8
  { url: '/splash/splash-750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
  { url: '/splash/splash-1334x750.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
  // iPhone 8 Plus
  { url: '/splash/splash-1242x2208.png', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-2208x1242.png', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
  // iPhone X / XS / 11 Pro / 12 mini / 13 mini
  { url: '/splash/splash-1125x2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-2436x1125.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
  // iPhone XR / 11
  { url: '/splash/splash-828x1792.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
  { url: '/splash/splash-1792x828.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
  // iPhone XS Max / 11 Pro Max
  { url: '/splash/splash-1242x2688.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-2688x1242.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
  // iPhone 12 / 12 Pro / 13 / 13 Pro / 14
  { url: '/splash/splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-2532x1170.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
  // iPhone 12 Pro Max / 13 Pro Max / 14 Plus
  { url: '/splash/splash-1284x2778.png', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-2778x1284.png', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
  // iPhone 14 Pro / 15 / 15 Pro / 16
  { url: '/splash/splash-1179x2556.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-2556x1179.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
  // iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  { url: '/splash/splash-1290x2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-2796x1290.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
  // iPhone 16 Pro
  { url: '/splash/splash-1206x2622.png', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-2622x1206.png', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
  // iPhone 16 Pro Max
  { url: '/splash/splash-1320x2868.png', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-2868x1320.png', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
]
