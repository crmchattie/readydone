import { processHistoryUpdate } from '@/lib/gmail/service';
import { getUser } from '@/lib/db/queries';
import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

interface PubSubMessage {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

interface GmailNotification {
  emailAddress: string;
  historyId: string;
}

async function verifyGoogleToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  const client = new OAuth2Client();
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT
    });
    
    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      return false;
    }

    // Verify the token was issued by Google Cloud Pub/Sub
    return payload.email === process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT;
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Verify Google authentication
    const authHeader = request.headers.get('Authorization');
    const isAuthenticated = await verifyGoogleToken(authHeader);
    
    if (!isAuthenticated) {
      console.error('Failed to authenticate Google Pub/Sub request');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify the subscription matches our expected subscription
    const body = (await request.json()) as PubSubMessage;
    const subscriptions = process.env.GMAIL_PUBSUB_SUBSCRIPTIONS?.split(',') || [];
    
    if (!subscriptions.includes(body.subscription)) {
      console.error('Received notification from unknown subscription:', body.subscription);
      return new NextResponse('Invalid subscription', { status: 400 });
    }

    // Decode the message data
    const decodedData = Buffer.from(body.message.data, 'base64').toString();
    const notification = JSON.parse(decodedData) as GmailNotification;

    // Get user by email
    const users = await getUser(notification.emailAddress);
    if (users.length === 0) {
      console.error('No user found for email:', notification.emailAddress);
      return new NextResponse('User not found', { status: 404 });
    }

    // Process the history update
    await processHistoryUpdate(users[0].id, notification.historyId);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing Gmail notification:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 