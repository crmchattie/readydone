import { ResendClient } from './client';
import { 
  getThread,
  saveThread,
  getMessagesByThreadId,
  saveThreadMessages,
  getExternalPartyByEmail,
  saveExternalParty
} from '@/lib/db/queries';
import { generateAIResponse } from '@/lib/ai/actions';

interface EmailMessageData {
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

export async function initiateEmailThread(
  userId: string,
  recipientEmail: string,
  chatId: string,
  subject: string,
  initialMessage: string,
  apiKey: string,
  fromEmail: string
): Promise<string> {
  try {
    // Create Resend client
    const resendClient = await createResendClientForUser(userId, apiKey, fromEmail);
    if (!resendClient) {
      throw new Error('Failed to create Resend client');
    }

    // Send the initial message
    const sentMessage = await resendClient.sendMessage({
      to: recipientEmail,
      subject,
      body: initialMessage
    });

    // Create or get external party
    let externalParty = await getExternalPartyByEmail({ email: recipientEmail });
    if (!externalParty) {
      await saveExternalParty({
        name: recipientEmail.split('@')[0], // Basic name from email
        email: recipientEmail,
        type: 'email_contact',
        phone: null,
        address: null,
        latitude: null,
        longitude: null,
        website: null
      });
      externalParty = await getExternalPartyByEmail({ email: recipientEmail });
    }

    if (!externalParty) {
      throw new Error('Failed to create or retrieve external party');
    }

    // Generate a UUID for the thread
    const threadId = crypto.randomUUID();

    // Create a new thread
    const newThread = await saveThread({
      id: threadId,
      chatId,
      externalPartyId: externalParty.id,
      name: subject,
      externalSystemId: sentMessage.id,
      status: 'awaiting_reply',
      lastMessagePreview: `Initial message sent to ${recipientEmail}`
    });

    // Save the sent message
    await saveThreadMessages({
      messages: [{
        threadId,
        externalMessageId: sentMessage.id,
        role: 'user',
        subject,
        content: initialMessage
      }]
    });

    return threadId;
  } catch (error) {
    console.error('Error initiating email thread:', error);
    throw error;
  }
}

export async function generateAndSendResponse(
  userId: string,
  threadId: string,
  latestMessage: EmailMessageData,
  apiKey: string,
  fromEmail: string
): Promise<void> {
  try {
    // Create Resend client
    const resendClient = await createResendClientForUser(userId, apiKey, fromEmail);
    if (!resendClient) {
      throw new Error('Failed to create Resend client');
    }

    // Get conversation history for AI context
    const messages = await getMessagesByThreadId({ threadId });
    const thread = await getThread({ id: threadId });

    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    // Generate AI response
    const response = await generateAIResponse({
      userId,
      latestMessage,
      conversationHistory: messages,
      threadContext: thread
    });

    // Send the response via Resend
    const sentMessage = await resendClient.replyToMessage({
      to: latestMessage.from,
      subject: latestMessage.subject,
      body: response,
      replyTo: latestMessage.from
    });

    // Save the sent message
    await saveThreadMessages({
      messages: [{
        threadId,
        externalMessageId: sentMessage.id,
        role: 'ai',
        subject: latestMessage.subject,
        content: response
      }]
    });

    // Update thread status while preserving required fields
    await saveThread({
      id: threadId,
      chatId: thread.chatId,
      externalPartyId: thread.externalPartyId,
      name: thread.name,
      externalSystemId: thread.externalSystemId || undefined,
      lastMessagePreview: 'AI response sent',
      status: 'replied'
    });
  } catch (error) {
    console.error('Error generating and sending response:', error);
    throw error;
  }
}

export async function processIncomingEmail(
  userId: string,
  message: EmailMessageData,
  apiKey: string,
  fromEmail: string
): Promise<void> {
  try {
    // Find or create thread
    let thread = await getThread({ id: message.threadId });
    
    if (!thread) {
      // If no thread exists, this might be a new conversation
      // You might want to create a new thread here or handle it differently
      console.log(`No thread found for message ${message.id}`);
      return;
    }

    // Save the incoming message
    await saveThreadMessages({
      messages: [{
        threadId: thread.id,
        externalMessageId: message.id,
        role: 'external',
        subject: message.subject,
        content: message.body
      }]
    });

    // Update thread while preserving required fields
    await saveThread({
      id: thread.id,
      chatId: thread.chatId,
      externalPartyId: thread.externalPartyId,
      name: thread.name,
      externalSystemId: thread.externalSystemId || undefined,
      lastMessagePreview: `New message from ${message.from.split('<')[0].trim()}`,
      status: 'awaiting_reply'
    });

    // Generate and send AI response
    await generateAndSendResponse(userId, thread.id, message, apiKey, fromEmail);
  } catch (error) {
    console.error('Error processing incoming email:', error);
    throw error;
  }
} 