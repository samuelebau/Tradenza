'use client'

// Dev-only client-side Clerk shim — single-user, no-auth mode.
//
// Mirrors the server-side `@/lib/dev/auth` shim: when
// `NEXT_PUBLIC_AUTH_DISABLED=1` the client bundle skips Clerk entirely (no
// remote `clerk.browser.js` fetch, which in dev-no-auth has no usable key and
// otherwise times out with `failed_to_load_clerk_js` / `failed_to_load_clerk_js_timeout`).
// Every Clerk client primitive used by the app is replaced with a no-op/stub
// that reports a single signed-in dev user. When the flag is unset the symbols
// delegate verbatim to the real `@clerk/nextjs` and behaviour is unchanged.
//
// `AUTH_DISABLED` is server-only; `NEXT_PUBLIC_AUTH_DISABLED` is its
// client-visible mirror (set together in docker/docker-compose.yml) — the
// client bundle can only read `NEXT_PUBLIC_*` values.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClerkProvider as RealClerkProvider,
  useAuth as realUseAuth,
  useClerk as realUseClerk,
  useUser as realUseUser,
  UserButton as RealUserButton,
  SignedIn as RealSignedIn,
  SignedOut as RealSignedOut,
  SignIn as RealSignIn,
  SignUp as RealSignUp,
} from '@clerk/nextjs'
import type { ReactNode } from 'react'

export const DEV = process.env.NEXT_PUBLIC_AUTH_DISABLED === '1'

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID || 'user_dev_local'
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'dev@tradenza.local'
const DEV_FIRST_NAME = process.env.NEXT_PUBLIC_DEV_USER_FIRST_NAME || 'Dev'
const DEV_LAST_NAME = process.env.NEXT_PUBLIC_DEV_USER_LAST_NAME || 'User'
const DEV_USERNAME = process.env.NEXT_PUBLIC_DEV_USERNAME || 'dev'

// ─── Dev stubs ───────────────────────────────────────────────────────────────
// Minimal surface: only what the app reads. Real Clerk objects are much larger;
// the casts at the exports keep call sites type-safe without mirroring every
// field.

function DevClerkProvider({ children }: { children: ReactNode }) {
  // No Clerk context, no remote script — just pass children through.
  return <>{children}</>
}

function useAuthDev() {
  return { isLoaded: true, isSignedIn: true, userId: DEV_USER_ID }
}

function useClerkDev() {
  return {
    // Account deletion in dev purges the DB (server side); sign-out is a no-op
    // because there is no real session. Kept async to match the real signature.
    signOut: async (_opts?: { redirectUrl?: string }) => {},
  }
}

function useUserDev() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: DEV_USER_ID,
      username: DEV_USERNAME,
      firstName: DEV_FIRST_NAME,
      lastName: DEV_LAST_NAME,
      primaryEmailAddress: { emailAddress: DEV_EMAIL },
      imageUrl: '',
    },
  }
}

// A static avatar standing in for Clerk's <UserButton>. No dropdown: in
// dev-no-auth there is nothing to sign out of and no Clerk profile to manage.
function UserButtonDev({ appearance: _appearance }: { appearance?: unknown }) {
  void _appearance
  const initials =
    `${(DEV_FIRST_NAME[0] ?? '').trim()}${(DEV_LAST_NAME[0] ?? '').trim()}`.toUpperCase() || 'D'
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground select-none"
      aria-label={`${DEV_FIRST_NAME} ${DEV_LAST_NAME}`}
      title={`${DEV_FIRST_NAME} ${DEV_LAST_NAME} · ${DEV_EMAIL}`}
    >
      {initials}
    </span>
  )
}

// The dev user is always signed in → render signed-in children, drop the
// signed-out chrome (sign-in/sign-up CTAs make no sense without auth).
function SignedInDev({ children }: { children: ReactNode }) {
  return <>{children}</>
}
function SignedOutDev(_props: { children?: ReactNode }) {
  return null
}

// Auth pages are unreachable in dev-no-auth (the landing nav links straight to
// /dashboard); if hit directly, bounce there instead of mounting Clerk.
function RedirectToDashboard() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])
  return null
}

// ─── Exports: dev stubs in dev, real Clerk otherwise ──────────────────────────
export const ClerkProvider = (DEV
  ? DevClerkProvider
  : RealClerkProvider) as unknown as typeof RealClerkProvider
export const useAuth = (DEV ? useAuthDev : realUseAuth) as unknown as typeof realUseAuth
export const useClerk = (DEV ? useClerkDev : realUseClerk) as unknown as typeof realUseClerk
export const useUser = (DEV ? useUserDev : realUseUser) as unknown as typeof realUseUser
export const UserButton = (DEV ? UserButtonDev : RealUserButton) as unknown as typeof RealUserButton
export const SignedIn = (DEV ? SignedInDev : RealSignedIn) as unknown as typeof RealSignedIn
export const SignedOut = (DEV ? SignedOutDev : RealSignedOut) as unknown as typeof RealSignedOut
export const SignIn = (DEV ? RedirectToDashboard : RealSignIn) as unknown as typeof RealSignIn
export const SignUp = (DEV ? RedirectToDashboard : RealSignUp) as unknown as typeof RealSignUp