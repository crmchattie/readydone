import { NextResponse } from 'next/server';
import { createSession, endSession, saveBrowserDocument } from '@/lib/browserbase/service';

export async function POST(request: Request) {
  try {
    const { timezone, contextId, keepAlive, title, chatId, documentId } = await request.json();
    const result = await createSession(timezone, contextId, { keepAlive });
    
    // Save browser session as document if title and chatId are provided
    if (title && chatId) {
      await saveBrowserDocument({
        sessionId: result.sessionId,
        title,
        chatId,
        documentId
      });
    }
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    await endSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to end session' },
      { status: 500 }
    );
  }
} 