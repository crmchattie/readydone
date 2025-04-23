import { GmailClient } from './client';
import { 
  getUserOAuthCredentialsByUserId, 
} from '@/lib/db/queries';

interface NewMessageData {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  body: string;
}

export async function createGmailClientForUser(userId: string): Promise<GmailClient | null> {
  try {
    // Get OAuth credentials for this user
    const credentials = await getUserOAuthCredentialsByUserId({ userId });

    // Find Gmail credentials
    const gmailCreds = credentials.find(cred => cred.providerName.toLowerCase() === 'gmail');

    if (!gmailCreds) {
      console.log(`No Gmail credentials found for user ${userId}`);
      return null;
    }

    // Create Gmail client
    return new GmailClient(
      userId,
      {
        accessToken: gmailCreds.accessToken,
        refreshToken: gmailCreds.refreshToken || undefined,
        expiresAt: gmailCreds.expiresAt || undefined
      },
      gmailCreds.id
    );
  } catch (error) {
    console.error('Error creating Gmail client:', error);
    return null;
  }
}