import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'
import DevTestPanel from '@/components/DevTestPanel'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    /* app-shell + app-scroll : sur mobile le document ne défile plus,
       seule <main> défile — plus de rebond élastique ni de barre Safari
       qui apparaît/disparaît. Voir globals.css. */
    <div className="app-shell flex flex-col">
      <NavBar />
      <main
        id="app-scroll"
        className="app-scroll flex-1 px-4 pt-5 pb-[calc(5.5rem+var(--sab))] lg:ml-60 lg:px-10 lg:pb-8 lg:w-[calc(100%-15rem)] bg-[oklch(0.983_0.005_75)]"
      >
        {children}
      </main>
      <DevTestPanel />
    </div>
  )
}
