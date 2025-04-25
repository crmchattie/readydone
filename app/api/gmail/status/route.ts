import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserOAuthCredentials } from '@/lib/db/queries';

export async function GET() {
  try {
    // Get the current user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }
    
    // Check if user has Gmail OAuth credentials
    const credentials = await getUserOAuthCredentials({
      userId: session.user.id,
      providerName: 'gmail'
    });
    
    return NextResponse.json({ 
      connected: !!credentials && !!credentials.accessToken
    });
  } catch (error) {
    console.error('Error checking Gmail connection status:', error);
    return NextResponse.json({ connected: false, error: 'Failed to check connection status' }, { status: 500 });
  }
} 