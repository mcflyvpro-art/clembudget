import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  /*
   * Tout passe par l'auth SAUF les fichiers qui doivent rester publics.
   *
   * ⚠️ Point critique PWA : Safari télécharge /manifest.webmanifest et
   * /sw.js SANS cookies. S'ils passent par ce proxy, ils sont redirigés
   * vers /login → Safari reçoit du HTML au lieu du manifeste, l'ignore,
   * et « Ajouter à l'écran d'accueil » crée un simple marque-page Safari
   * au lieu d'une vraie app plein écran. C'était le bug.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|apple-touch-icon.png|splash/|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|webmanifest)$).*)',
  ],
}
