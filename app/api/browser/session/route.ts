import { NextResponse } from 'next/server';
import { createSession, endSession } from '@/lib/browserbase/service';

export async function POST(request: Request) {
  try {
    const { timezone, contextId } = await request.json();
    const result = await createSession(timezone, contextId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
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
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    await endSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
} 