import { auth } from '@/app/(auth)/auth';
import { getThreadsByChatId } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const searchParams = req.nextUrl.searchParams;
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new NextResponse(JSON.stringify({ error: 'Missing chatId parameter' }), {
      status: 400,
    });
  }

  try {
    const threads = await getThreadsByChatId({ chatId });
    return NextResponse.json(threads);
  } catch (error) {
    console.error('Error fetching threads:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch threads' }), {
      status: 500,
    });
  }
} 