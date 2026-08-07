'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SpiralAnimation } from '@/components/ui/spiral-animation'

const ROUTES = ['/', '/stats', '/historique', '/categories', '/recurrents']

const EASTER_EGGS = [
  '🌸 Curieuse !',
  "✨ Tu l'as trouvé !",
  '🎀 Petit secret dévoilé...',
]

const DURATION_MS = 10000

export default function InitPage() {
  const router = useRouter()
  const [fadeOut, setFadeOut]     = useState(false)
  const [textIn, setTextIn]       = useState(false)
  const [easterEgg, setEasterEgg] = useState<string | null>(null)
  const clickCountRef = useRef(0)
  const clickResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eggTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ROUTES.forEach((r) => router.prefetch(r))

    const showText = setTimeout(() => setTextIn(true), 600)
    const nav = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => router.replace('/'), 600)
    }, DURATION_MS)

    return () => { clearTimeout(showText); clearTimeout(nav) }
  }, [router])

  const handleBgClick = useCallback(() => {
    clickCountRef.current += 1
    if (clickResetRef.current) clearTimeout(clickResetRef.current)
    clickResetRef.current = setTimeout(() => { clickCountRef.current = 0 }, 2500)

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0
      const msg = EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)]
      setEasterEgg(msg)
      if (eggTimerRef.current) clearTimeout(eggTimerRef.current)
      eggTimerRef.current = setTimeout(() => setEasterEgg(null), 2800)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: '#100208',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.6s ease',
      }}
    >
      {/* Spiral zoomée */}
      <div
        className="absolute inset-0"
        style={{ transform: 'scale(1.7)', transformOrigin: 'center center' }}
      >
        <SpiralAnimation />
      </div>

      {/* Zone cliquable easter egg */}
      <div className="absolute inset-0 z-10" onClick={handleBgClick} aria-hidden="true" />

      {/* BIENVENUE centré */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <span
          style={{
            fontSize: 'clamp(1.6rem, 5vw, 3rem)',
            fontWeight: 200,
            letterSpacing: '0.45em',
            textTransform: 'uppercase',
            color: '#FBCFE8',
            textShadow: [
              '0 0 20px rgba(249,168,212,0.9)',
              '0 0 50px rgba(233,104,138,0.6)',
              '0 0 90px rgba(208,83,122,0.35)',
            ].join(', '),
            opacity: textIn ? 1 : 0,
            transform: textIn ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 1.2s ease, transform 1.2s ease',
            userSelect: 'none',
          }}
        >
          Bienvenue
        </span>
      </div>

      {/* Easter egg badge */}
      {easterEgg && (
        <div
          className="absolute z-30"
          style={{
            top: '22%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(16,2,8,0.90)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(249,168,212,0.4)',
            borderRadius: '20px',
            padding: '10px 24px',
            fontSize: '15px',
            fontWeight: 500,
            color: '#F9A8D4',
            boxShadow: '0 0 28px rgba(233,104,138,0.25)',
            animation: 'easterEggPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
          }}
        >
          {easterEgg}
        </div>
      )}
    </div>
  )
}
