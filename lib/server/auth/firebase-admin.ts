import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { Auth, getAuth, SessionCookieOptions } from 'firebase-admin/auth'
const serviceAccount = require('../../../.credentials/firebase-admin.json')
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  })
}

class FirebaseAuth {
  constructor(private auth: Auth) {}
  public async decodeSessionCookie(
    token: string,
    checkRevoked?: boolean
  ): Promise<{
    id: string
    email?: string
    name: string
    picture?: string
    sub: string
  }> {
    const { uid, email, name, picture, sub } =
      await this.auth.verifySessionCookie(token, checkRevoked)
    return { id: uid, email, name, picture, sub }
  }
  public async verifySessionCookie(
    token: string,
    checkRevoked?: boolean
  ): Promise<boolean> {
    try {
      await this.decodeSessionCookie(token, checkRevoked)
      return true
    } catch (error) {
      return false
    }
  }
  public async createSessionCookie(
    token: string,
    sessionCookieOptions: SessionCookieOptions
  ) {
    return await this.auth.createSessionCookie(token, sessionCookieOptions)
  }
  public async revokeRefreshTokens(uid: string) {
    return await this.auth.revokeRefreshTokens(uid)
  }
}

export const auth = new FirebaseAuth(getAuth())
