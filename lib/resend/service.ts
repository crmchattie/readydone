import { ResendClient } from './client';

interface NewMessageData {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  body: string;
}

export async function createResendClientForUser(userId: string, apiKey: string, fromEmail: string): Promise<ResendClient | null> {
  try {
    return new ResendClient(userId, apiKey, fromEmail);
  } catch (error) {
    console.error('Error creating Resend client:', error);
    return null;
  }
}