// Dev-only auth shim — single-user, no-auth mode for the local devbox.
//
// When `AUTH_DISABLED=1` the app runs as ONE fixed local user without Clerk:
// every server call site that imports `{ auth, currentUser, clerkClient }`
// from `@/lib/dev/auth` gets a stable dev identity instead of a real Clerk
// session, so the app is fully usable without signing in. When `AUTH_DISABLED`
// is unset (production, tests, normal local dev with real Clerk keys), the
// symbols delegate verbatim to the real Clerk helpers and behaviour is
// unchanged — this module is a transparent passthrough.
//
// Why a shim and not middleware-only: Clerk is read in many server modules
// (layouts, server actions, sync-user, admin). The middleware can stop
// forcing redirects, but `auth()` would still return no `userId` and the
// layouts would bounce to /sign-in. Centralising the three Clerk server
// helpers here is the smallest change that makes the whole app work as a
// single dev user.
//
// Client-side Clerk (useAuth, SignedIn, UserButton, …) still sees no real
// session in dev-no-auth mode: this affects only cosmetic chrome (the landing
// nav shows "Sign in", the sidebar UserButton is empty). All data flows go
// through server code, which uses the dev identity. See docker/README.md.
import {
  auth as clerkAuth,
  currentUser as clerkCurrentUser,
  clerkClient as clerkClerkClient,
} from '@clerk/nextjs/server'

export const DEV = process.env.AUTH_DISABLED === '1'

// Identity of the single dev user. Override via env to match a real user id
// if you want to reuse an existing data set, or to give the admin area access.
const DEV_USER_ID = process.env.DEV_USER_ID || 'user_dev_local'
const DEV_EMAIL = process.env.DEV_USER_EMAIL || 'dev@tradenza.local'
const DEV_FIRST_NAME = process.env.DEV_USER_FIRST_NAME || 'Dev'
const DEV_LAST_NAME = process.env.DEV_USER_LAST_NAME || 'User'
const DEV_USERNAME = process.env.DEV_USERNAME || 'dev'

// Clerk's AuthObject has more fields than the app reads (only `userId` is
// destructured). We cast to the real type so call sites stay type-safe without
// having to mirror the whole interface.
type AuthReturn = Awaited<ReturnType<typeof clerkAuth>>
type CurrentUserReturn = Awaited<ReturnType<typeof clerkCurrentUser>>
type ClerkClientReturn = Awaited<ReturnType<typeof clerkClerkClient>>

function devAuth(): AuthReturn {
  return {
    userId: DEV_USER_ID,
    sessionId: null,
    sessionClaims: null,
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    orgPermissions: [],
    factorVerificationAge: null,
    isAuthenticated: () => true,
    isUnknown: () => false,
    // No-op protect: the dev user is always "signed in".
    protect: async () => {},
    getToken: async () => null,
    debug: () => ({ dev: true, userId: DEV_USER_ID }),
  } as unknown as AuthReturn
}

function devCurrentUser(): CurrentUserReturn {
  return {
    id: DEV_USER_ID,
    passwordEnabled: false,
    totpEnabled: false,
    backupCodeEnabled: false,
    twoFactorEnabled: false,
    createdAt: 0,
    updatedAt: 0,
    emailAddresses: [
      { id: 'dev_email_1', emailAddress: DEV_EMAIL, verification: { status: 'verified' } },
    ],
    primaryEmailAddressId: 'dev_email_1',
    phoneNumbers: [],
    primaryPhoneNumberId: null,
    web3Wallets: [],
    externalAccounts: [],
    publicMetadata: {},
    privateMetadata: {},
    unsafeMetadata: {},
    username: DEV_USERNAME,
    firstName: DEV_FIRST_NAME,
    lastName: DEV_LAST_NAME,
    imageUrl: '',
    hasImage: false,
    deleteSelfEnabled: true,
    createOrganizationEnabled: true,
    createOrganizationsLimit: 0,
    samlAccounts: [],
    lastActiveAt: 0,
    lastSignInAt: 0,
    externalId: null,
    gender: null,
    birthday: '',
  } as unknown as CurrentUserReturn
}

// Minimal stub of the Clerk Backend SDK surface used by the app:
//   client.users.deleteUser(id)           (account.ts, admin.ts)
//   client.users.getUserList({limit,off}) (admin.ts → reconcile)
// All become no-ops / empty results: in dev-no-auth there is no Clerk backend.
function devClerkClient(): ClerkClientReturn {
  const users = {
    deleteUser: async (_id: string) => ({}),
    getUser: async (_id: string) => null,
    getUserList: async (_opts?: { limit?: number; offset?: number }) => ({
      data: [],
      totalCount: 0,
    }),
    updateUser: async (_id: string, _data: unknown) => ({}),
  }
  return { users } as unknown as ClerkClientReturn
}

export const auth: typeof clerkAuth = DEV ? (devAuth as unknown as typeof clerkAuth) : clerkAuth
export const currentUser: typeof clerkCurrentUser = DEV
  ? (devCurrentUser as unknown as typeof clerkCurrentUser)
  : clerkCurrentUser
export const clerkClient: typeof clerkClerkClient = DEV
  ? (devClerkClient as unknown as typeof clerkClerkClient)
  : clerkClerkClient
