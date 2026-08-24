'use client'

import { useEffect } from 'react'

/**
 * Transforme le comportement « page web » de Safari iOS en comportement d'app.
 *
 * Safari iOS ignore volontairement `user-scalable=no` : la balise viewport
 * seule ne suffit donc pas à bloquer le zoom. Il faut intercepter les
 * gestes de pincement à la main.
 *
 * Ce composant ne rend rien, il ne fait qu'installer des écouteurs.
 */
export function NativeApp() {
  useEffect(() => {
    const root = document.documentElement

    /* ── 1. Marqueur « app installée » pour le CSS ─────────────────── */
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true)

    if (standalone) root.classList.add('is-standalone')

    /* ── 2. Blocage du zoom (pincement + double-tap) ───────────────── */
    // Gestes Safari : gesturestart/change/end pilotent le pinch-zoom.
    const blockGesture = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart', blockGesture, { passive: false })
    document.addEventListener('gesturechange', blockGesture, { passive: false })
    document.addEventListener('gestureend', blockGesture, { passive: false })

    // Filet de sécurité : tout déplacement à 2 doigts ou plus.
    const blockMultiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault()
    }
    document.addEventListener('touchmove', blockMultiTouch, { passive: false })

    // Le double-tap zoom est neutralisé par `touch-action: manipulation`
    // (globals.css) — on ne touche pas à touchend pour ne pas casser les clics.

    /* ── 3. Clavier iOS : on masque la tab bar pendant la saisie ─────
       Sans ça, la barre d'onglets reste coincée derrière le clavier et le
       champ focalisé peut passer sous l'écran. On cale la hauteur de la
       coquille sur le viewport réellement visible. */
    const vv = window.visualViewport
    let lastHeight = 0
    let frame = 0

    const syncViewport = () => {
      if (!vv) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const h = Math.round(vv.height)
        // seuil : on ignore les micro-variations (barre d'URL, inertie de scroll)
        if (Math.abs(h - lastHeight) < 40) return
        lastHeight = h
        root.style.setProperty('--vv-height', `${h}px`)
        // > 120px d'écart avec la fenêtre = clavier ouvert
        root.classList.toggle('is-keyboard-open', window.innerHeight - h > 120)
      })
    }
    syncViewport()
    vv?.addEventListener('resize', syncViewport)

    /* ── 4. Pas de menu contextuel long-press sur le contenu ───────── */
    // (on laisse passer les champs de saisie : copier/coller reste utile)
    const blockContextMenu = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, [contenteditable="true"]')) return
      e.preventDefault()
    }
    document.addEventListener('contextmenu', blockContextMenu)

    return () => {
      document.removeEventListener('gesturestart', blockGesture)
      document.removeEventListener('gesturechange', blockGesture)
      document.removeEventListener('gestureend', blockGesture)
      document.removeEventListener('touchmove', blockMultiTouch)
      document.removeEventListener('contextmenu', blockContextMenu)
      cancelAnimationFrame(frame)
      vv?.removeEventListener('resize', syncViewport)
    }
  }, [])

  return null
}
