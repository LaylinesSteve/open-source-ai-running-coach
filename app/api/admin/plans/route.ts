import { NextResponse } from 'next/server';
import { listAllPlansSummary } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = await listAllPlansSummary();
    return NextResponse.json({ plans });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list plans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
