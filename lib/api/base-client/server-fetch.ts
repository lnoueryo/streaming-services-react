import { ApiFetchError, BaseClient } from './base-client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/server/auth/firebase-admin'
import { headers } from 'next/headers'

export class ServerFetch extends BaseClient {
  constructor(baseUrl: string) {
    const fetchFunc = async (url: string, options: RequestInit) => {
      const cookieStore = cookies()
      const requestCookies = await cookieStore
      const session = requestCookies.get('session')?.value
      if (!session) {
        return await this.goToLoginPage.bind(this)()
      }
      if (!(await auth.verifySessionCookie(session, true))) {
        return await this.goToLoginPage.bind(this)()
      }
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Cookie: `session=${session}`
        }
      })
      if (res.status >= 400) {
        const data = await res.json()
        throw new ApiFetchError(data)
      }
      return res
    }
    super(baseUrl, fetchFunc)
  }
  private async goToLoginPage() {
    const header = await headers()
    const next = header.get('x-url') || '/'
    const nextQuery = this.buildQuery({ next })
    redirect(`/login${nextQuery}`)
  }
}
