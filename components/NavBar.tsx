'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart2, Home, LogOut, Repeat, Archive, Tag, Target } from 'lucide-react'
import { signOut } from '@/app/actions'
import EasterEgg from '@/components/EasterEgg'

const NAV = [
  { href: '/',            icon: Home,     label: 'Accueil' },
  { href: '/stats',       icon: BarChart2, label: 'Stats' },
  { href: '/objectifs',   icon: Target,   label: 'Objectifs' },
  { href: '/recurrents',  icon: Repeat,   label: 'Récurrents' },
  { href: '/historique',  icon: Archive,  label: 'Historique' },
  { href: '/categories',  icon: Tag,      label: 'Catégories' },
] as const

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [logoClicks, setLogoClicks] = useState(0)
  const [showEasterEgg, setShowEasterEgg] = useState(false)

  function handleLogoClick(e: React.MouseEvent) {
    const next = logoClicks + 1
    if (next >= 7) {
      e.preventDefault()
      setLogoClicks(0)
      setShowEasterEgg(true)
    } else {
      setLogoClicks(next)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Mobile : header slim (logo + quitter) ─────────── */}
      <header
        className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border lg:hidden"
        style={{ paddingTop: 'var(--sat)' }}
      >
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href="/" onClick={handleLogoClick} className="shrink-0 flex items-center">
            <Image
              src="/logo.svg"
              alt="Budget Perso"
              width={978}
              height={400}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>

          <button
            onClick={handleSignOut}
            aria-label="Quitter"
            className="flex items-center justify-center -mr-1.5 w-9 h-9 rounded-full text-muted-foreground hover:text-foreground active:bg-muted transition-colors cursor-pointer"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── Mobile : tab bar en bas (façon iOS) ───────────── */}
      <nav
        className="app-tabbar lg:hidden fixed inset-x-0 bottom-0 z-30 bg-background/90 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: 'var(--sab)' }}
      >
        <div className="grid grid-cols-6">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground active:text-foreground'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-9 h-7 rounded-full transition-colors ${
                    active ? 'bg-primary/10' : ''
                  }`}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="leading-none">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Desktop : sidebar fixe ────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-background border-r-2 border-border z-20">

        {/* Logo */}
        <div className="px-5 pt-7 pb-6">
          <Link href="/" onClick={handleLogoClick}>
            <Image
              src="/logo.svg"
              alt="Budget Perso"
              width={978}
              height={400}
              className="w-full h-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 flex flex-col gap-1 justify-center">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold transition-colors ${
                pathname === href
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="px-3 pb-6 pt-3 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer w-full"
          >
            <LogOut size={20} />
            Quitter
          </button>
        </div>
      </aside>

      {showEasterEgg && <EasterEgg onClose={() => setShowEasterEgg(false)} />}
    </>
  )
}
