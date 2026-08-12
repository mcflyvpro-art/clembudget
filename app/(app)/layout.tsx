import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'
import DevTestPanel from '@/components/DevTestPanel'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-dvh flex flex-col">
      <NavBar />
      <main
        className="flex-1 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:ml-60 lg:px-10 lg:pb-8 lg:w-[calc(100%-15rem)] bg-[oklch(0.983_0.005_75)]"
      >
        {children}
      </main>
      <DevTestPanel />
    </div>
  )
}
