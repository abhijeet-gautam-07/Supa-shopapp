import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 1. Create response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Setup Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Get User (This refreshes the session cookie if needed)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 4. Handle Redirects
  // If user is ALREADY logged in and tries to go to login/register, send them to Shop
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') && user) {
     const redirectUrl = new URL('/shop', request.url)
     const redirectResponse = NextResponse.redirect(redirectUrl)
     
     // IMPORTANT: Copy the fresh cookies to the redirect response
     // Without this, the session refresh is lost, and the user gets logged out
     copyCookies(response, redirectResponse)
     
     return redirectResponse
  }

  // 5. Return response
  return response
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
}