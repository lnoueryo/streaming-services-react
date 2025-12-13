// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // もし static assets や API を除外したい場合は追加
  if (pathname.startsWith("/_next/") || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  const next = pathname + search

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-url', next);
console.log(' middleware next:', next)
  const session = req.cookies.get('session')?.value;
  if (session) {
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', next);
  return NextResponse.redirect(loginUrl);
}

// export const config = {
//   matcher: [
//     '/',
//     '/room/:path*'
//   ],
// };