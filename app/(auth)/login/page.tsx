'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/init')
  }

  return (
    <AuroraBackground className="px-6">
      <div className="w-full max-w-[340px] relative z-10">

        {/* Logo */}
        <div
          className="mb-8 mx-auto"
          style={{
            borderRadius: '22px',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(233,104,138,0.22), 0 2px 8px rgba(233,104,138,0.12)',
          }}
        >
          <Image
            src="/groslogo.svg"
            alt="Budget Perso"
            width={978}
            height={400}
            priority
            className="w-full h-auto"
          />
        </div>

        {/* Accroche */}
        <p
          className="text-center mb-7 text-sm"
          style={{ color: '#B85873', fontStyle: 'italic', letterSpacing: '0.025em' }}
        >
          Ton suivi du quotidien
        </p>

        {/* Carte formulaire — fond rosé */}
        <div
          style={{
            background: 'rgba(253,232,237,0.78)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '22px',
            border: '1.5px solid rgba(246,169,188,0.45)',
            boxShadow: '0 4px 40px rgba(233,104,138,0.14), 0 1px 4px rgba(233,104,138,0.08)',
            padding: '28px 24px 24px',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#A05268',
                }}
              >
                Email
              </label>
              <InputField
                id="email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="toi@exemple.fr"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#A05268',
                }}
              >
                Mot de passe
              </label>
              <InputField
                id="password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <p style={{ fontSize: '12px', color: '#C0484A' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: loading
                  ? 'rgba(246,169,188,0.6)'
                  : 'linear-gradient(135deg,#E9688A 0%,#D0537A 100%)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.01em',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 18px rgba(233,104,138,0.38)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'scale(1.015)'
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(233,104,138,0.48)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 18px rgba(233,104,138,0.38)'
              }}
            >
              {loading ? (
                <>
                  <LoadingSpinner size={18} />
                  <span>Un instant…</span>
                </>
              ) : isSignUp ? (
                'Créer mon compte'
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
          style={{
            marginTop: '18px',
            display: 'block',
            width: '100%',
            textAlign: 'center',
            fontSize: '12px',
            color: '#B85873',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.15s ease',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#E9688A' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#B85873' }}
        >
          {isSignUp
            ? 'Déjà un compte ? Se connecter'
            : 'Pas encore de compte ? Créer un compte'}
        </button>
      </div>
    </AuroraBackground>
  )
}

function InputField({
  id, type, value, onChange, placeholder, autoComplete,
}: {
  id: string; type: string; value: string
  onChange: (v: string) => void; placeholder: string; autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)

  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required
      autoComplete={autoComplete}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: 'block',
        width: '100%',
        height: '44px',
        padding: '0 14px',
        borderRadius: '12px',
        background: 'rgba(253,218,227,0.55)',
        border: focused
          ? '1.5px solid #E9688A'
          : '1.5px solid rgba(246,169,188,0.5)',
        boxShadow: focused ? '0 0 0 3px rgba(233,104,138,0.12)' : 'none',
        outline: 'none',
        fontSize: '14px',
        color: '#2D1520',
        transition: 'border 0.15s ease, box-shadow 0.15s ease',
        boxSizing: 'border-box',
      }}
    />
  )
}
