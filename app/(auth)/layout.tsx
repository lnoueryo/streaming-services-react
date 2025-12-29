import { auth } from '@/lib/server/auth/firebase-admin'
import { cookies, headers } from 'next/headers'
import { UserProvider } from './user-provider'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

export default async function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  const header = await headers()
  const next = header.get('x-url') || '/'

  if (!session) {
    return redirect(`/login?next=${encodeURIComponent(next)}`)
  }
  try {
    const user = await auth.decodeSessionCookie(session, true)
    return (
      <UserProvider
        user={{
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.picture
        }}
      >
        {children}
      </UserProvider>
    )
  } catch (error) {
    logger.debug('next', next)
    return redirect(`/login?next=${encodeURIComponent(next)}`)
  }
}
