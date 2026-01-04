import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Check if environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // If env vars are missing, just pass through (might be during build)
    return response
  }

  // Determine if we're in production
  const isProduction = process.env.NODE_ENV === 'production'

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set({
              name,
              value,
              ...options,
              domain: isProduction ? '.apextsgroup.com' : undefined,
              sameSite: 'lax',
              secure: isProduction,
              path: '/',
            })
          })
        },
      },
    }
  )

  // Refresh session if expired (catch errors to prevent build failures)
  try {
    await supabase.auth.getUser()
  } catch (error) {
    // Ignore auth errors in middleware (might be during build)
    console.error('Middleware auth error:', error)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

