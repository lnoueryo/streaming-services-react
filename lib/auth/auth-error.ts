export interface AuthErrorInfo {
  statusCode: number
  message: string
}

export class AuthError extends Error {
  public readonly statusCode: number

  constructor({ statusCode, message }: AuthErrorInfo) {
    super(message)
    this.statusCode = statusCode
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}
