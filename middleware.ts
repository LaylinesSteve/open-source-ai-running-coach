import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Homepage lives at /; redirect /app to /
  if (pathname === '/app') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  // Require passkey cookie for /app/form only (plan view at /app/plan/[id] is shareable)
  if (pathname === '/app/form') {
    const cookie = request.cookies.get('plan_access');
    const secret = process.env.COOKIE_SECRET || process.env.PASSKEY;
    if (!secret || cookie?.value !== secret) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app', '/app/form'],
};
