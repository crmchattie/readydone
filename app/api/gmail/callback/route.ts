import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { google } from 'googleapis';
import { saveUserOAuthCredentials, getUserOAuthCredentials } from '@/lib/db/queries';
import { setupGmailWatch } from '@/lib/gmail/service';
import { GMAIL_SCOPES_STRING } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    // Get the authorization code and state from the URL search params
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const referrer = url.searchParams.get('state') || '';
    const isFromSettings = referrer.includes('settings');
    const isFromCorporate = referrer.includes('corporate');
    
    // Handle missing authorization code
    if (!code) {
      console.error('No authorization code provided');
      // Respect the source of the request even for errors
      if (isFromSettings) {
        return NextResponse.redirect(new URL('/settings?tab=accounts&error=No+authorization+code+provided', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
      }
      if (isFromCorporate) {
        return NextResponse.redirect(new URL('/corporate?error=No+authorization+code+provided', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
      }
      return NextResponse.redirect(new URL('/gmail-connect?error=No+authorization+code+provided', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
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
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
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
    
    // Set up Gmail watch notifications
    try {
      await setupGmailWatch(session.user.id);
    } catch (error) {
      console.error('Error setting up Gmail watch notifications:', error);
      // Continue with the flow even if watch setup fails - we can retry later
    }
    
    // Determine where to redirect based on where the user came from
    if (isFromSettings) {
      return NextResponse.redirect(new URL('/settings?tab=accounts&success=Gmail+connected', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }
    
    // For new accounts and other cases, send to home
    return NextResponse.redirect(new URL('/?success=Gmail+connected', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    
    // Get state param to determine the source even in case of errors
    const url = new URL(request.url);
    const referrer = url.searchParams.get('state') || '';
    const isFromSettings = referrer.includes('settings');
    const isFromCorporate = referrer.includes('corporate');
    
    if (isFromSettings) {
      return NextResponse.redirect(new URL('/settings?tab=accounts&error=Failed+to+authenticate+with+Google', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }
    if (isFromCorporate) {
      return NextResponse.redirect(new URL('/corporate?error=Failed+to+authenticate+with+Google', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }
    return NextResponse.redirect(new URL('/gmail-connect?error=Failed+to+authenticate+with+Google', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
} 