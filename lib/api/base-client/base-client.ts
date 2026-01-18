import { logger } from '@/lib/logger'

export type ApiErrorBody = {
  statusCode: number
  errorCode?: string
  message?: string
}

export class ApiFetchError extends Error {
  public statusCode: number
  public errorCode?: string

  constructor({ statusCode, message, errorCode }: ApiErrorBody) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
  }
}

export class BaseClient {
  constructor(
    private baseUrl: string,
    private fetchFunc: (
      baseUrl: string,
      options: RequestInit
    ) => Promise<Response | void>
  ) {}
  get(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ) {
    return this.apiFetch(`${url}${this.buildQuery(params)}`, {
      method: 'GET',
      headers: { ...(headers || {}) }
    })
  }

  post(url: string, body?: any) {
    return this.apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
  }

  patch(url: string, body?: any) {
    return this.apiFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
  }

  put(url: string, body?: any) {
    return this.apiFetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
  }

  delete(url: string, body?: any) {
    return this.apiFetch(url, {
      method: 'DELETE',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private async apiFetch(url: string, options: RequestInit) {
    logger.debug(`${this.baseUrl}${url}`)
    return await this.fetchFunc(`${this.baseUrl}${url}`, options)
  }

  protected buildQuery(params?: Record<string, any>) {
    if (!params) return ''
    const q = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        q.append(key, String(value))
      }
    })
    return `?${q.toString()}`
  }
}
