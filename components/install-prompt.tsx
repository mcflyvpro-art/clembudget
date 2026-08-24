'use client'
import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> }

const DISMISS_KEY = 'install-prompt-dismissed-at'
const DISMISS_DAYS = 30

function isIos() {
  if (typeof navigator === 'undefined') return false
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS se fait passer pour macOS
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

function wasDismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    if (!at) return false
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    /* mode privé : tant pis, on réaffichera */
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Déjà installée, ou déjà écartée récemment
    if (isInStandaloneMode() || wasDismissedRecently()) return

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

  function dismiss() {
    rememberDismissal()
    setDismissed(true)
  }

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
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
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
            Accès rapide depuis ton écran d&apos;accueil
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
            onClick={dismiss}
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

  // iOS Safari : instructions Partager → Sur l'écran d'accueil
  if (showIosHint) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(253,224,192,0.97)',
          backdropFilter: 'blur(16px)',
          borderRadius: '18px',
          border: '1.5px solid rgba(233,104,138,0.3)',
          boxShadow: '0 8px 32px rgba(233,104,138,0.25)',
          padding: '16px 20px',
          maxWidth: '310px',
          width: 'calc(100vw - 40px)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#A05268', marginBottom: '8px' }}>
          Installer Mon Budget
        </div>
        <div style={{ fontSize: '11px', color: '#B85873', lineHeight: '1.6' }}>
          Dans <strong style={{ color: '#E9688A' }}>Safari</strong>, appuie sur{' '}
          <strong style={{ color: '#E9688A' }}>Partager</strong> (le carré avec la flèche, en bas),
          puis <strong style={{ color: '#E9688A' }}>« Sur l&apos;écran d&apos;accueil »</strong>.
          <br />
          L&apos;app s&apos;ouvrira ensuite en plein écran, sans barre Safari.
        </div>
        <button
          onClick={dismiss}
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
