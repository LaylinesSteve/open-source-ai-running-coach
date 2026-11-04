import { NextResponse } from 'next/server';
import { hasAccess } from '@/lib/auth';
import { listAllPlansSummary } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: 'Passkey required' }, { status: 401 });
  }
  try {
    const plans = await listAllPlansSummary();
    return NextResponse.json({ plans });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list plans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
