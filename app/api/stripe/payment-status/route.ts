import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { hasUserPaid } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const priceId = url.searchParams.get('priceId');

    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId' },
        { status: 400 }
      );
    }

    const hasPaid = await hasUserPaid(user.id, priceId);

    return NextResponse.json({ paid: hasPaid });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
} 