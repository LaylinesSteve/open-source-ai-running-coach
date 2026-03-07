import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  // Don't send tokens to client
  const { stravaAccessToken, stravaRefreshToken, ...safe } = plan;
  return NextResponse.json(safe);
}
