import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { google } from 'googleapis';
import { saveUserOAuthCredentials, getUserOAuthCredentials, updateUser } from '@/lib/db/queries';
import { setupGmailWatch } from '@/lib/gmail/service';
import { GMAIL_SCOPES_STRING } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    // Get the authorization code and state from the URL search params
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const referrer = url.searchParams.get('state') || '';
    const isFromSettings = referrer === 'settings';
    const isFromOnboarding = referrer === 'onboarding';
    
    // Handle missing authorization code
    if (!code) {
      console.error('No authorization code provided');
      if (isFromSettings) {
        return NextResponse.redirect(new URL('/settings?error=No+authorization+code+provided', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
      }
      return NextResponse.redirect(new URL('/onboarding?error=No+authorization+code+provided', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }
    
    // Get the current user
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.email) {
      console.error('No authenticated user found or no email');
      return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }
    
    // Set up the OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
    );
    
    // Exchange the authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Get existing credentials to preserve refresh token if needed
    const existingCreds = await getUserOAuthCredentials({
      userId: session.user.id,
      providerName: 'gmail'
    });
    
    // Save the tokens to the database, preserving existing refresh token if no new one provided
    await saveUserOAuthCredentials({
      userId: session.user.id,
      providerName: 'gmail',
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || existingCreds?.refreshToken || null,
      scopes: tokens.scope || GMAIL_SCOPES_STRING,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    });

    // Update user's gmailConnected status
    await updateUser({
      id: session.user.id,
      gmailConnected: true
    });
    
    // Set up Gmail watch notifications
    try {
      await setupGmailWatch(session.user.id);
    } catch (error) {
      console.error('Error setting up Gmail watch notifications:', error);
      // Continue with the flow even if watch setup fails - we can retry later
    }
    
    // Determine where to redirect based on where the user came from
    if (isFromSettings) {
      return NextResponse.redirect(new URL('/settings?success=Gmail+connected', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }
    
    // For onboarding or other cases, return to onboarding
    return NextResponse.redirect(new URL('/onboarding?success=Gmail+connected', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    
    // Get state param to determine the source even in case of errors
    const url = new URL(request.url);
    const referrer = url.searchParams.get('state') || '';
    const isFromSettings = referrer === 'settings';
    
    if (isFromSettings) {
      return NextResponse.redirect(new URL('/settings?error=Failed+to+connect+Gmail', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }
    
    return NextResponse.redirect(new URL('/onboarding?error=Failed+to+connect+Gmail', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
} 