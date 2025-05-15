import { NextResponse } from 'next/server';
import { getRecordingUrl } from '@/lib/browserbase/service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const recordingUrl = await getRecordingUrl(sessionId);
    
    return NextResponse.json({ 
      success: true, 
      recordingUrl 
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch recording'
      },
      { status: 500 }
    );
  }
} 