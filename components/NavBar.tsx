'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart2, Home, LogOut, Repeat, Archive } from 'lucide-react'
import { signOut } from '@/app/actions'

const NAV = [
  { href: '/',           icon: Home,     label: 'Accueil' },
  { href: '/stats',      icon: BarChart2, label: 'Stats' },
  { href: '/recurrents', icon: Repeat,   label: 'Récurrents' },
  { href: '/archive',    icon: Archive,  label: 'Historique' },
] as const

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 lg:px-10 h-14 flex items-center justify-between">
        <Link href="/" className="text-base font-semibold tracking-tight shrink-0">
          Budget Perso
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
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-1"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Quitter</span>
          </button>
        </nav>
      </div>
    </header>
  )
}
