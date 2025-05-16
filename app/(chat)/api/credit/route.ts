import { NextRequest, NextResponse } from 'next/server';
import { getCreditsByUserId } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const balance = await getCreditsByUserId(session.user.id);
    return NextResponse.json({ balance });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch credit balance' }, { status: 500 });
  }
} 