import Login from './Login'
import { auth } from '@/lib/server/auth/firebase-admin'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const header = await headers()
  const back = header.get('referer') || '/'
  const params = await searchParams
  const next = params.next || '/'

  const cookieStore = cookies()
  const cookie = await cookieStore
  const sessionCookie = cookie.get('session')
  if (sessionCookie) {
    const isSignedIn = await auth.verifySessionCookie(sessionCookie.value, true)
    if (isSignedIn) {
      return redirect(back)
    }
  }
  return <Login next={next} />
}
