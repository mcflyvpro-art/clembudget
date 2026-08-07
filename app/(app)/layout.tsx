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
      <main className="flex-1 px-4 pb-8 pt-5 lg:ml-60 lg:px-10 lg:w-[calc(100%-15rem)] bg-[oklch(0.983_0.005_75)]">
        {children}
      </main>
      <DevTestPanel />
    </div>
  )
}
