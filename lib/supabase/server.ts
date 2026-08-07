import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

// cache() déduplique les appels dans le même arbre de rendu RSC.
// Layout + page qui appellent tous les deux createClient/getUser
// ne font qu'UNE seule requête Supabase par request.
export const createClient = cache(async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Supprimer maxAge/expires → cookie de session uniquement
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { maxAge, expires, ...sessionOpts } = (options ?? {}) as Record<string, unknown>
              cookieStore.set(name, value, sessionOpts as Parameters<typeof cookieStore.set>[2])
            })
          } catch {}
        },
      },
    }
  )
})

/** Auth dédupliquée — layout + pages partagent le même résultat. */
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
