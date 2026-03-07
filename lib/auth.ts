import { cookies } from 'next/headers';

const COOKIE_NAME = 'plan_access';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function getPasskey(): string {
  const passkey = process.env.PASSKEY;
  if (!passkey) throw new Error('PASSKEY env is not set');
  return passkey;
}

export async function verifyPasskey(input: string): Promise<boolean> {
  return input === getPasskey();
}

export async function setAccessCookie(): Promise<void> {
  const secret = process.env.COOKIE_SECRET || process.env.PASSKEY;
  if (!secret) return;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, secret, {
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
  const secret = process.env.COOKIE_SECRET || process.env.PASSKEY;
  return !!secret && value === secret;
}

export async function clearAccessCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
