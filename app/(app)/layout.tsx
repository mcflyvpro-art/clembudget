import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-dvh flex flex-col">
      <NavBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-10 pb-8 pt-5">
        {children}
      </main>
    </div>
  )
}
