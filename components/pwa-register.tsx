'use client'
import { useEffect } from 'react'

/**
 * Enregistre le service worker et gère les mises à jour silencieusement.
 *
 * Une app native se met à jour toute seule : ici on vérifie une nouvelle
 * version à chaque ouverture et à chaque retour au premier plan, puis on
 * bascule dessus sans que l'utilisatrice ait à vider quoi que ce soit.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Au premier chargement il n'y a pas encore de controller : le SW
    // prendra la main tout seul, inutile de recharger la page.
    const hadController = Boolean(navigator.serviceWorker.controller)
    let reloading = false

    const onControllerChange = () => {
      if (!hadController || reloading) return
      reloading = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        reg.update().catch(() => {})
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing
          if (!sw) return
          sw.addEventListener('statechange', () => {
            // Nouvelle version prête et une ancienne tourne encore → on bascule
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.postMessage('SKIP_WAITING')
            }
          })
        })
      })
      .catch(err => console.error('[PWA] SW échec:', err))

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      navigator.serviceWorker.getRegistration().then(reg => reg?.update().catch(() => {}))
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
