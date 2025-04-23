import { auth } from '@/app/(auth)/auth';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new NextResponse(JSON.stringify({ error: 'Missing chatId parameter' }), {
      status: 400,
    });
  }
  
  try {
    // First verify the chat exists and user has access
    const chat = await getChatById({ id: chatId });
    
    if (!chat) {
      return new NextResponse(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
      });
    }

    // For private chats, verify ownership
    if (chat.visibility === 'private' && chat.userId !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    // Get messages
    const messages = await getMessagesByChatId({ id: chatId });
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch messages' }), {
      status: 500,
    });
  }
} 