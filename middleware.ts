// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const session = req.cookies.get('session')?.value;
  if (session) {
    return NextResponse.next();
  }
  const url = req.nextUrl;
  const next = url.pathname + (url.search || '');

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', next);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/',
    '/room/:path*'
  ],
};