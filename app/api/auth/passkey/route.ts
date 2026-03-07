import { NextRequest, NextResponse } from 'next/server';
import { verifyPasskey, setAccessCookie, clearAccessCookie } from '@/lib/auth';

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
