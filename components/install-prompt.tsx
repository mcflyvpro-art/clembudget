'use client'
import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> }

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Déjà installée
    if (isInStandaloneMode()) return

    if (isIos()) {
      // iOS : afficher les instructions après 2s
      const t = setTimeout(() => setShowIosHint(true), 2000)
      return () => clearTimeout(t)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
  }

  if (dismissed) return null

  // Android / desktop Chrome / Edge
  if (deferredPrompt) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(253,224,192,0.97)',
          backdropFilter: 'blur(16px)',
          borderRadius: '18px',
          border: '1.5px solid rgba(233,104,138,0.3)',
          boxShadow: '0 8px 32px rgba(233,104,138,0.25)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '320px',
          width: 'calc(100vw - 40px)',
        }}
      >
        <div style={{ fontSize: '28px' }}>📲</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#A05268', marginBottom: '2px' }}>
            Installer Mon Budget
          </div>
          <div style={{ fontSize: '11px', color: '#B85873' }}>
            Accès rapide depuis ton écran d'accueil
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={install}
            style={{
              background: 'linear-gradient(135deg,#E9688A,#D0537A)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Installer
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#B85873',
              fontSize: '11px',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
    )
  }

  // iOS Safari : instructions Share → Ajouter
  if (showIosHint) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(253,224,192,0.97)',
          backdropFilter: 'blur(16px)',
          borderRadius: '18px',
          border: '1.5px solid rgba(233,104,138,0.3)',
          boxShadow: '0 8px 32px rgba(233,104,138,0.25)',
          padding: '16px 20px',
          maxWidth: '300px',
          width: 'calc(100vw - 40px)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#A05268', marginBottom: '8px' }}>
          Installer Mon Budget
        </div>
        <div style={{ fontSize: '11px', color: '#B85873', lineHeight: '1.6' }}>
          Appuie sur <strong style={{ color: '#E9688A' }}>Partager</strong> (icône en bas){' '}
          puis <strong style={{ color: '#E9688A' }}>« Sur l'écran d'accueil »</strong>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            marginTop: '12px',
            background: 'none',
            border: 'none',
            color: '#B85873',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          OK, compris
        </button>
      </div>
    )
  }

  return null
}
