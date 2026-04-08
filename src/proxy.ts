import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Only initialize if env vars are present (skips in local dev without Redis)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

// Login: max 10 attempts per minute per IP
const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:login' })
  : null

// API shortcuts: max 60 requests per minute per IP
const apiLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:api' })
  : null

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'
  )
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const path = request.nextUrl.pathname
  const ip = getIp(request)

  // Rate limit login attempts — only the login page POST, not the OAuth callback (/api/auth)
  if (path.startsWith('/login') && request.method === 'POST') {
    if (loginLimiter) {
      const { success } = await loginLimiter.limit(ip)
      if (!success) {
        return new NextResponse('Too many requests', { status: 429 })
      }
    }
  }

  // Rate limit API shortcuts
  if (path.startsWith('/api/shortcuts')) {
    if (apiLimiter) {
      const { success } = await apiLimiter.limit(ip)
      if (!success) {
        return new NextResponse('Too many requests', { status: 429 })
      }
    }
  }

  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/shortcuts') ||
    path.startsWith('/api/backup')

  // If Supabase env vars are missing, just allow everything through
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  let user = null

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
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

    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // If Supabase is unreachable, allow public pages through
    if (isPublic) return supabaseResponse
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
