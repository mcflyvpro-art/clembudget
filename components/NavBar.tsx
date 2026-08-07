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
      {/* ── Mobile : barre du haut ────────────────────────── */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b-2 border-border lg:hidden">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="shrink-0 flex items-center">
            <Image
              src="/logo.svg"
              alt="Budget Perso"
              width={978}
              height={400}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>

          <nav className="flex items-center gap-0.5">
            {NAV.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname === href
                    ? 'text-primary font-medium bg-primary/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={16} />
                <span className="hidden">{label}</span>
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-1"
            >
              <LogOut size={16} />
              <span className="hidden">Quitter</span>
            </button>
          </nav>
        </div>
      </header>

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
