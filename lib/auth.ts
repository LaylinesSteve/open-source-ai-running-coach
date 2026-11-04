import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'plan_access';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function getPasskey(): string {
  const passkey = process.env.PASSKEY;
  if (!passkey) throw new Error('PASSKEY env is not set');
  return passkey;
}

export async function verifyPasskey(input: string): Promise<boolean> {
  return safeEqual(input, getPasskey());
}

/** Cookie value derived from the secret, so a leaked cookie doesn't reveal the passkey. */
function accessToken(): string | null {
  const secret = process.env.COOKIE_SECRET || process.env.PASSKEY;
  return secret ? createHmac('sha256', secret).update(COOKIE_NAME).digest('hex') : null;
}

export async function setAccessCookie(): Promise<void> {
  const token = accessToken();
  if (!token) return;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function hasAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  const token = accessToken();
  return !!token && !!value && safeEqual(value, token);
}

export async function clearAccessCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Plans listed in GARMIN_PLAN_IDS hold health data, so they need the passkey. All other plans stay open by link. */
export function isPrivatePlan(planId: string): boolean {
  return (process.env.GARMIN_PLAN_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .includes(planId);
}

export async function canAccessPlan(planId: string): Promise<boolean> {
  return !isPrivatePlan(planId) || (await hasAccess());
}

/** For API routes: a 401 response when this plan needs the passkey and the request lacks it. */
export async function requirePlanAccess(planId: string): Promise<NextResponse | null> {
  if (await canAccessPlan(planId)) return null;
  return NextResponse.json(
    { error: 'Your session has expired. Reload the page and enter your passkey.' },
    { status: 401 }
  );
}
