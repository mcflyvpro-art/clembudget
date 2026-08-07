import { createBrowserClient } from '@supabase/ssr'

type CookieOpts = {
  maxAge?: number
  expires?: Date | string
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: string
}

function setSessionCookie(name: string, value: string, opts: CookieOpts = {}) {
  // Ignore maxAge et expires → cookie de session (effacé à la fermeture complète)
  const { maxAge: _m, expires: _e, path = '/', domain, secure, sameSite = 'lax' } = opts
  let c = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`
  if (secure) c += '; Secure'
  if (domain) c += `; Domain=${domain}`
  document.cookie = c
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          return document.cookie
            .split(';')
            .filter(Boolean)
            .map(c => {
              const idx = c.indexOf('=')
              return {
                name: decodeURIComponent(c.slice(0, idx).trim()),
                value: decodeURIComponent(c.slice(idx + 1).trim()),
              }
            })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (!value) {
              document.cookie = `${encodeURIComponent(name)}=; path=/; Max-Age=0`
            } else {
              setSessionCookie(name, value, (options as CookieOpts) ?? {})
            }
          })
        },
      },
    }
  )
}
