// lib/api.ts
import output from '@/config';
import AuthService from '@/lib/auth/auth.service';

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

export async function apiFetch(url: string, options: RequestInit = {}) {
  await AuthService.waitAuthReady();
  const res = await fetch(`${output.httpApiOrigin}${url}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      authorization: `Bearer ${await AuthService.getIdToken()}`,
    }
  });

  if (res.status === 401) {
    await AuthService.signOut();
    if (typeof window !== 'undefined') {
      const next = window.location.pathname + window.location.search;
      const nextQuery = buildQuery({ next });
      window.location.href = `/login${nextQuery}`;
    }
    throw new Error('Unauthorized')
  }

  return res;
}

export const api = {
  get: (url: string, params?: Record<string, any>) =>
    apiFetch(`${url}${buildQuery(params)}`, {
      method: 'GET',
    }),

  post: (url: string, body?: any) =>
    apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),

  put: (url: string, body?: any) =>
    apiFetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),

  delete: (url: string) =>
    apiFetch(url, {
      method: 'DELETE',
    }),
};