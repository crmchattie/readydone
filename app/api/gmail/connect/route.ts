import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { google } from 'googleapis';
import { GMAIL_SCOPES } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    // Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=Authentication+required`);
    }
    
    // Get the referrer to store in state
    const referrer = request.headers.get('referer') || '';
    const stateParam = referrer.includes('settings') 
      ? 'settings' 
      : referrer.includes('onboarding') 
        ? 'onboarding'
        : 'home';
    
    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
    );
    
    // Generate the URL that will be used for the consent dialog
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      prompt: 'consent',
      state: stateParam, // Pass through the state to the callback
    });
    
    // Redirect the user to the auth URL
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    const referrer = request.headers.get('referer') || '';
    const errorRedirect = referrer.includes('settings')
      ? '/settings?error=Failed+to+initiate+Gmail+connection'
      : '/onboarding?error=Failed+to+initiate+Gmail+connection';
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${errorRedirect}`);
  }
} 