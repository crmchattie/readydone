import { auth } from '@/app/(auth)/auth';
import { getMessagesByThreadId } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const searchParams = req.nextUrl.searchParams;
  const threadId = searchParams.get('threadId');

  if (!threadId) {
    return new NextResponse(JSON.stringify({ error: 'Missing threadId parameter' }), {
      status: 400,
    });
  }

  try {
    const messages = await getMessagesByThreadId({ threadId });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch thread messages' }), {
      status: 500,
    });
  }
} 