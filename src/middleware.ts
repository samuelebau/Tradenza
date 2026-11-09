import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { buildCsp, generateNonce } from '@/lib/csp'

// Routes that require authentication are everything NOT listed here.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/opengraph-image(.*)',
  '/api/webhooks(.*)',
  '/api/health',
  '/robots.txt',
  '/sitemap.xml',
  '/privacy',
  '/terms',
])

// Paths that are allowed to live on the marketing domain (tradenza.dev).
// Everything else on that host is redirected to the app domain.
const isMarketingRoute = createRouteMatcher([
  '/',
  '/opengraph-image(.*)',
  '/manifest.webmanifest',
  '/icon(.*)',
  '/apple-icon(.*)',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/api/webhooks(.*)',
  '/api/health',
  '/privacy',
  '/terms',
])

function hostOf(url?: string) {
  if (!url) return ''
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

const APP_HOST = hostOf(process.env.NEXT_PUBLIC_APP_URL)
const MARKETING_HOST = hostOf(process.env.NEXT_PUBLIC_MARKETING_URL)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

// Dev-no-auth mode (local devbox, single user): when AUTH_DISABLED=1 the app
// runs without Clerk — `auth()/currentUser()/clerkClient()` in server code are
// shimmed (@/lib/dev/auth) to a fixed dev identity, and the Clerk middleware
// itself is bypassed here so a placeholder CLERK_SECRET_KEY can't break request
// handling. Only the per-request nonce + CSP is applied. When AUTH_DISABLED is
// unset, the real Clerk middleware runs unchanged.
const AUTH_DISABLED = process.env.AUTH_DISABLED === '1'

async function applyCsp(request: import('next/server').NextRequest) {
  const nonce = generateNonce()
  const csp = buildCsp(nonce, process.env.NODE_ENV !== 'production')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('content-security-policy', csp)
  return response
}

const realMiddleware = clerkMiddleware(async (auth, request) => {
  const host = (request.headers.get('host') ?? '').toLowerCase()
  const { pathname, search } = request.nextUrl

  const isAppHost = Boolean(APP_HOST) && host === APP_HOST
  const isMarketingHost = Boolean(MARKETING_HOST) && (host === MARKETING_HOST || host === `www.${MARKETING_HOST}`)

  if (isMarketingHost && !isMarketingRoute(request) && APP_URL) {
    return NextResponse.redirect(new URL(pathname + search, APP_URL))
  }

  if (isAppHost && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  return applyCsp(request)
})

export default function middleware(request: import('next/server').NextRequest) {
  if (AUTH_DISABLED) return applyCsp(request)
  return realMiddleware(request)
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
