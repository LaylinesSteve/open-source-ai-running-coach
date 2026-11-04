import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { openFormLink } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Homepage lives at /; redirect /app to /
  if (pathname === '/app') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  const key = request.nextUrl.searchParams.get('key');
  if (pathname === '/app/running-form' && key) {
    return openFormLink(key, new URL('/app/running-form', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app', '/app/running-form'],
};
