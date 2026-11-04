import { NextRequest, NextResponse } from 'next/server';
import { verifyPasskey, setAccessCookie, clearAccessCookie } from '@/lib/auth';
import { countAttempt } from '@/lib/store';

const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_SEC = 15 * 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const passkey = body?.passkey?.trim();
    const logout = body?.logout;

    if (logout) {
      await clearAccessCookie();
      return NextResponse.json({ ok: true });
    }

    if (!passkey) {
      return NextResponse.json({ error: 'Passkey required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const attempts = await countAttempt(`passkey-attempts:${ip}`, ATTEMPT_WINDOW_SEC);
    if (attempts > MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const valid = await verifyPasskey(passkey);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid passkey' }, { status: 401 });
    }

    await setAccessCookie();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
