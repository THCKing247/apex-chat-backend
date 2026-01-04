import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    getAll() {
      // @supabase/ssr reads cookies automatically from document.cookie
      if (typeof document === 'undefined') return []
      return document.cookie.split(';').map(cookie => {
        const [name, ...rest] = cookie.trim().split('=')
        return { name, value: rest.join('=') }
      }).filter(c => c.name && c.value)
    },
    setAll(cookiesToSet) {
      // Set cookies with cross-subdomain domain in production
      if (typeof document === 'undefined') return
      cookiesToSet.forEach(({ name, value, options }) => {
        // Merge options with cross-subdomain settings
        const cookieOptions = {
          ...options,
          path: '/',
          sameSite: 'lax' as const,
          ...(isProduction && {
            domain: '.apextsgroup.com',
            secure: true,
          }),
        }
        // Build cookie string
        let cookieString = `${name}=${value}`
        if (cookieOptions.path) cookieString += `; path=${cookieOptions.path}`
        if (cookieOptions.domain) cookieString += `; domain=${cookieOptions.domain}`
        if (cookieOptions.sameSite) cookieString += `; sameSite=${cookieOptions.sameSite}`
        if (cookieOptions.secure) cookieString += `; secure`
        if (cookieOptions.maxAge) cookieString += `; max-age=${cookieOptions.maxAge}`
        if (cookieOptions.expires) cookieString += `; expires=${cookieOptions.expires.toUTCString()}`
        document.cookie = cookieString
      })
    },
  },
})

