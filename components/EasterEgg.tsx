'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function FlowerSpinner() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 100 100"
      style={{ animation: 'petalSpin 2.2s linear infinite', transformOrigin: '50% 50%' }}
    >
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <ellipse
          key={angle}
          cx="50" cy="21" rx="9" ry="21"
          fill="#FBCFE8" stroke="#F9A8D4" strokeWidth="0.8" opacity="0.92"
          transform={`rotate(${angle}, 50, 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="15" fill="#F9A8D4" />
      <circle cx="50" cy="50" r="9"  fill="#EC4899" />
    </svg>
  )
}

interface Props {
  onClose: () => void
}

export default function EasterEgg({ onClose }: Props) {
  const [phase, setPhase]           = useState<'loading' | 'reveal'>('loading')
  const [bgVisible, setBgVisible]   = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [prevIndex, setPrevIndex]   = useState<number | null>(null)
  const [direction, setDirection]   = useState<'right' | 'left'>('right')
  const [isAnimating, setIsAnimating] = useState(false)
  const [images, setImages]         = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    requestAnimationFrame(() => setBgVisible(true))
    const t = setTimeout(() => setPhase('reveal'), 3000)
    fetch('/api/easter-egg-photos')
      .then((r) => r.json())
      .then((d) => { if (d.photos?.length) setImages(d.photos) })
      .catch(() => {})
    return () => clearTimeout(t)
  }, [])

  const goTo = useCallback((nextIndex: number, dir: 'left' | 'right') => {
    if (isAnimating) return
    setDirection(dir)
    setPrevIndex(currentIndex)
    setCurrentIndex(nextIndex)
    setIsAnimating(true)
    setTimeout(() => {
      setPrevIndex(null)
      setIsAnimating(false)
    }, 380)
  }, [isAnimating, currentIndex])

  function goPrev() {
    const prev = (currentIndex - 1 + images.length) % images.length
    goTo(prev, 'left')
  }

  function goNext() {
    const next = (currentIndex + 1) % images.length
    goTo(next, 'right')
  }

  function handleClose() {
    setBgVisible(false)
    setTimeout(() => {
      onClose()
      router.push('/')
    }, 350)
  }

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden"
      style={{
        backgroundColor: '#FDE8ED',
        opacity: bgVisible ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    >
      {/* ── Phase chargement ────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6"
        style={{
          opacity: phase === 'loading' ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: phase === 'loading' ? 'auto' : 'none',
        }}
      >
        <div style={{ animation: 'petalPulse 1.8s ease-in-out infinite' }}>
          <FlowerSpinner />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-xl font-semibold" style={{ color: '#E9688A' }}>
            Félicitations...
          </p>
          <p className="text-base" style={{ color: '#F4A0BB' }}>
            vous avez trouvé le secret
          </p>
        </div>
      </div>

      {/* ── Phase révélation ────────────────────── */}
      <div
        className="absolute inset-0 overflow-y-auto flex flex-col items-center justify-start py-8 px-4"
        style={{
          opacity: phase === 'reveal' ? 1 : 0,
          transition: 'opacity 0.8s ease 0.3s',
          pointerEvents: phase === 'reveal' ? 'auto' : 'none',
        }}
      >
        <div className="w-full max-w-lg flex flex-col items-center gap-6">

          {/* Fleur déco */}
          <svg width="44" height="44" viewBox="0 0 100 100">
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <ellipse
                key={angle}
                cx="50" cy="24" rx="8" ry="18"
                fill="#FBCFE8" stroke="#F9A8D4" strokeWidth="1"
                transform={`rotate(${angle}, 50, 50)`}
              />
            ))}
            <circle cx="50" cy="50" r="12" fill="#F472B6" />
          </svg>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold" style={{ color: '#E9688A' }}>
              Félicitations !
            </h1>
            <p className="text-sm" style={{ color: '#F4A0BB' }}>
              Vous avez trouvé le secret de l&apos;appli
            </p>
          </div>

          {/* Slideshow */}
          <div className="w-full flex flex-col items-center gap-3">
          {images.length === 0 && (
            <p className="text-sm" style={{ color: '#F4A0BB' }}>Chargement des photos…</p>
          )}

            {/* Image container */}
            <div
              className="relative w-full rounded-3xl overflow-hidden shadow-2xl"
              style={{ border: '4px solid #FBCFE8', aspectRatio: '4/3' }}
            >
              {/* Image courante */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`cur-${currentIndex}`}
                src={images[currentIndex]}
                alt={`Photo ${currentIndex + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  animation: isAnimating
                    ? `${direction === 'right' ? 'slideInFromRight' : 'slideInFromLeft'} 0.38s ease forwards`
                    : 'none',
                }}
              />

              {/* Image sortante */}
              {prevIndex !== null && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`prev-${prevIndex}`}
                  src={images[prevIndex]}
                  alt={`Photo ${prevIndex + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    animation: `${direction === 'right' ? 'slideOutToLeft' : 'slideOutToRight'} 0.38s ease forwards`,
                  }}
                />
              )}

              {/* Flèche gauche */}
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-transform active:scale-90"
                style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}
                aria-label="Photo précédente"
              >
                <ChevronLeft size={20} style={{ color: '#E9688A' }} />
              </button>

              {/* Flèche droite */}
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-transform active:scale-90"
                style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}
                aria-label="Photo suivante"
              >
                <ChevronRight size={20} style={{ color: '#E9688A' }} />
              </button>
            </div>

            {/* Indicateurs (dots) */}
            <div className="flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > currentIndex ? 'right' : 'left')}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentIndex ? '20px' : '8px',
                    height: '8px',
                    backgroundColor: i === currentIndex ? '#E9688A' : '#FBCFE8',
                  }}
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>

            {/* Compteur */}
            <p className="text-xs tabular-nums" style={{ color: '#F4A0BB' }}>
              {currentIndex + 1} / {images.length}
            </p>
          </div>

          {/* Bouton retour */}
          <button
            onClick={handleClose}
            className="px-8 py-3.5 rounded-2xl font-semibold text-base text-white active:scale-95 transition-transform shadow-md mb-2"
            style={{ backgroundColor: '#E9688A' }}
          >
            Retourner sur l&apos;accueil
          </button>

        </div>
      </div>
    </div>
  )
}
