import { NextResponse } from 'next/server';
import { getRecordingEvents } from '@/lib/browserbase/service';

export async function GET(request: Request) {
  console.log('[recording/route] Received request for recording URL');
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    console.log('[recording/route] Session ID from request:', sessionId);
    
    if (!sessionId) {
      console.error('[recording/route] No session ID provided in request');
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('[recording/route] Attempting to fetch recording URL for session:', sessionId);
    const recordingEvents = await getRecordingEvents(sessionId);
    
    // Validate that we have an array of events
    if (!Array.isArray(recordingEvents)) {
      console.error('[recording/route] Invalid recording events format:', recordingEvents);
      return NextResponse.json(
        { success: false, error: 'Invalid recording events format' },
        { status: 500 }
      );
    }
    
    console.log('[recording/route] Successfully retrieved recording events');
    
    return NextResponse.json({ 
      success: true, 
      recordingEvents: recordingEvents 
    });
  } catch (error) {
    console.error('[recording/route] Error processing request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch recording'
      },
      { status: 500 }
    );
  }
} 