// lib/api.ts
import output from '@/config';
import AuthService from '@/lib/auth/auth.service';
import { AuthError } from '../auth/auth-error';

export type ApiErrorBody = {
  statusCode: number;
  errorCode?: string;
  message?: string;
}

export class ApiFetchError extends Error {
  public statusCode: number;
  public errorCode?: string;

  constructor({ statusCode, message, errorCode}: ApiErrorBody) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode
  }
}

function buildQuery(params?: Record<string, any>) {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      q.append(key, String(value));
    }
  });
  return `?${q.toString()}`;
}


const goToLoginPage = async () => {
  await AuthService.signOut();
  if (typeof window !== 'undefined') {
    const next = window.location.pathname + window.location.search;
    const nextQuery = buildQuery({ next });
    window.location.href = `/login${nextQuery}`;
  }
}

export class Client {
  constructor(private baseUrl: string) {}
  get(url: string, params?: Record<string, any>) {
    return this.apiFetch(`${url}${buildQuery(params)}`, {
      method: 'GET',
    })
  }

  post(url: string, body?: any) {
    return this.apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  put(url: string, body?: any) {
    return this.apiFetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  delete(url: string) {
    this.apiFetch(url, {
      method: 'DELETE',
    })
  }
  private async apiFetch(url: string, options: RequestInit = {}) {
    try {
      const token = await AuthService.getIdToken()
      const res = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          authorization: `Bearer ${token}`,
        }
      });

      if (res.status >= 400) {
        if (res.status === 401) {
          await goToLoginPage()
        }
        const data = await res.json()
        throw new ApiFetchError(data)
      }
      return res;

    } catch (error) {
      if (error instanceof AuthError) {
        if (error.statusCode === 401) {
          await goToLoginPage()
        }
      }
      throw error
    }
  }
};
