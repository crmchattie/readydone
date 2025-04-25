import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { google } from 'googleapis';
import { getUserOAuthCredentials } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userOAuthCredentials } from '@/lib/db/schema';

export async function DELETE(request: Request) {
  try {
    // Get the current user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check referrer to determine where to redirect
    const referrer = request.headers.get('referer') || '';
    const isFromSettings = referrer.includes('settings');
    
    // Get the user's OAuth credentials for Gmail
    const credentials = await getUserOAuthCredentials({
      userId: session.user.id,
      providerName: 'gmail'
    });
    
    if (!credentials) {
      return NextResponse.json({ 
        error: 'No Gmail account connected',
        redirectUrl: isFromSettings ? '/settings?tab=accounts' : '/'
      }, { status: 404 });
    }
    
    // Set up the OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
    );
    
    // Set the credentials
    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken || undefined
    });
    
    // Track token revocation success
    let accessTokenRevoked = false;
    let refreshTokenRevoked = false;
    
    try {
      // Revoke access token with Google
      if (credentials.accessToken) {
        try {
          await oauth2Client.revokeToken(credentials.accessToken);
          accessTokenRevoked = true;
          console.log('Access token successfully revoked');
        } catch (accessError) {
          console.error('Error revoking access token:', accessError);
        }
      }
      
      // If there's a refresh token, revoke that too
      if (credentials.refreshToken) {
        try {
          await oauth2Client.revokeToken(credentials.refreshToken);
          refreshTokenRevoked = true;
          console.log('Refresh token successfully revoked');
        } catch (refreshError) {
          console.error('Error revoking refresh token:', refreshError);
        }
      }
    } catch (revokeError) {
      console.error('Error in token revocation process:', revokeError);
      // Even if token revocation fails, we'll still remove from our database
    }
    
    // Delete the OAuth credentials for this provider and user
    await db
      .delete(userOAuthCredentials)
      .where(
        and(
          eq(userOAuthCredentials.userId, session.user.id),
          eq(userOAuthCredentials.providerName, 'gmail')
        )
      );
    
    return NextResponse.json({ 
      success: true,
      redirectUrl: isFromSettings ? '/settings?tab=accounts' : '/',
      details: {
        accessTokenRevoked,
        refreshTokenRevoked,
        credentialsRemoved: true
      }
    });
  } catch (error) {
    console.error('Error disconnecting Gmail account:', error);
    return NextResponse.json({ 
      error: 'Failed to disconnect Gmail account',
      redirectUrl: request.headers.get('referer')?.includes('settings') ? '/settings?tab=accounts' : '/'
    }, { status: 500 });
  }
} 