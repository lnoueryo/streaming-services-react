// import { useRouter } from 'next/navigation';
import { auth } from '@/lib/server/auth/firebase-admin'
import { cookies } from 'next/headers'
import { UserProvider } from './user-provider'
import { redirect } from 'next/navigation'

export default async function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  const nextUrl = cookieStore.get('NEXT_URL')?.value ?? '/'

  if (!session) {
    return `/login?next=${encodeURIComponent(nextUrl)}`
  }
  try {
    const user = await auth.decodeSessionCookie(session, true)
    return <UserProvider user={user}>{children}</UserProvider>
  } catch (error) {
    console.warn(error)
    return redirect(`/login?next=${encodeURIComponent(nextUrl)}`)
  }
}
