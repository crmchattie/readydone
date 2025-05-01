import { GmailClient } from './client';
import { 
  getUserOAuthCredentialsByUserId, 
  getThread,
  saveThreadMessages,
  getMessagesByThreadId, 
  saveThread, 
  saveGmailWatch,
  getGmailWatchByUserId,
  updateGmailWatchStatus,
  getAllActiveGmailWatches,
  getThreadByExternalId
} from '@/lib/db/queries';
import { generateAIResponse } from '@/lib/ai/actions';
import type { ThreadMessage } from '@/lib/db/schema';
import { generateUUID } from '../utils';

interface NewMessageData {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  body: string;
}

interface MessageContent {
  from: string;
  to: string;
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

export async function pollForNewMessages(userId: string, threadId: string): Promise<NewMessageData[]> {
  try {
    // Get thread details
    const thread = await getThread({ id: threadId });
    if (!thread || !thread.externalSystemId) {
      console.log(`Thread ${threadId} not found or has no Gmail thread ID`);
      return [];
    }

    // Create Gmail client
    const gmailClient = await createGmailClientForUser(userId);
    if (!gmailClient) {
      return [];
    }

    // Get the latest message we've processed
    const existingMessages = await getMessagesByThreadId({ threadId });
    const lastMessageId = existingMessages.length > 0
      ? existingMessages[existingMessages.length - 1].externalMessageId
      : '';

    // Check for new messages
    const gmailThread = await gmailClient.getMessageThread(thread.externalSystemId);
    const messages = gmailThread.messages || [];

    // If no existing messages, return all
    if (!lastMessageId) {
      return messages.map(msg => gmailClient.extractMessageContent(msg));
    }

    // Find new messages (after last known message)
    return await gmailClient.checkForNewMessages(thread.externalSystemId, lastMessageId);
  } catch (error) {
    console.error('Error polling for new messages:', error);
    return [];
  }
}

export async function processNewMessages(userId: string, threadId: string): Promise<boolean> {
  try {
    // Poll for new messages
    const newMessages = await pollForNewMessages(userId, threadId);
    if (newMessages.length === 0) {
      return false;
    }

    const thread = await getThread({ id: threadId });
    if (!thread) {
      console.error(`Thread ${threadId} not found`);
      return false;
    }

    // Process and save each new message
    for (const message of newMessages) {
      // Check if this is from the external party (not from us)
      const isInbound = !message.from.includes(userId) && !message.from.toLowerCase().includes('savvo');

      if (isInbound) {
        // Save the message to our database
        const newMessage: Omit<ThreadMessage, 'id' | 'createdAt'> = {
          threadId,
          externalMessageId: message.id || null,
          role: 'external',
          subject: message.subject || null,
          content: {
            from: message.from,
            to: message.to,
            body: message.body
          }
        };

        await saveThreadMessages({ messages: [newMessage] });

        // Update the thread with latest summary
        await saveThread({
          id: threadId,
          name: thread.name,
          chatId: thread.chatId,
          externalPartyId: thread.externalPartyId,
          externalSystemId: thread.externalSystemId || undefined,
          status: 'awaiting_reply',
          lastMessagePreview: `New message from ${message.from.split('<')[0].trim()}`
        });

        // Generate an AI response for this message
        await generateAndSendResponse(userId, threadId, message);
      }
    }

    return newMessages.length > 0;
  } catch (error) {
    console.error('Error processing new messages:', error);
    return false;
  }
}

export async function generateAndSendResponse(
  userId: string,
  threadId: string,
  latestMessage: NewMessageData
): Promise<void> {
  try {
    // Create Gmail client first
    const gmailClient = await createGmailClientForUser(userId);
    if (!gmailClient) {
      throw new Error('Failed to create Gmail client');
    }

    // Get conversation history for AI context
    const threadMessages = await gmailClient.getThreadMessages(latestMessage.threadId);
    const conversationHistory = threadMessages.map(msg => {
      const content = gmailClient.extractMessageContent(msg);
      const message: ThreadMessage = {
        id: generateUUID(),
        threadId,
        createdAt: content.date,
        externalMessageId: msg.id || null,
        role: 'external',
        subject: content.subject || null,
        content: {
          from: content.from,
          to: content.to,
          body: content.body
        }
      };
      return message;
    });

    // Get all messages in the thread for context
    const allMessages = await getMessagesByThreadId({ threadId });
    const thread = await getThread({ id: threadId });

    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    // Generate AI response
    const response = await generateAIResponse({
      userId,
      latestMessage,
      conversationHistory,
      threadContext: {
        id: threadId,
        name: thread.name,
        chatId: thread.chatId,
        createdAt: thread.createdAt,
        externalPartyId: thread.externalPartyId,
        externalSystemId: thread.externalSystemId,
        status: thread.status,
        lastMessagePreview: thread.lastMessagePreview
      }
    });

    // Send the response to review email instead of external party
    const reviewEmail = process.env.REVIEW_EMAIL || 'admin@example.com';
    const externalEmail = latestMessage.from;
    
    const reviewSubject = `[REVIEW NEEDED] Re: ${latestMessage.subject}`;
    const reviewBody = `Original message from: ${externalEmail}
Original message: 
${latestMessage.body}

Proposed AI Response:
${response}

To approve and send this response, please review and forward to: ${externalEmail}
Thread ID: ${latestMessage.threadId}
Message ID: ${latestMessage.id}`;

    const sentMessage = await gmailClient.sendMessage({
      to: reviewEmail,
      subject: reviewSubject,
      body: reviewBody
    });

    // Save the draft response to our database
    const newMessage: Omit<ThreadMessage, 'id' | 'createdAt'> = {
      threadId,
      externalMessageId: sentMessage.id || null,
      role: 'ai',
      subject: reviewSubject,
      content: {
        from: 'me',
        to: reviewEmail,
        body: response
      }
    };

    await saveThreadMessages({ messages: [newMessage] });

    // Update thread status
    await saveThread({
      id: threadId,
      name: thread.name,
      chatId: thread.chatId,
      externalPartyId: thread.externalPartyId,
      externalSystemId: thread.externalSystemId || undefined,
      status: 'awaiting_reply',
      lastMessagePreview: 'AI response sent for review'
    });

  } catch (error) {
    console.error('Error generating and sending response:', error);
    throw error;
  }
}



export async function pollAllActiveConversations(userId: string): Promise<number> {
  // This would get all active conversations for a user and poll each one
  // Implement based on how you want to structure the polling
  // For now, this is a placeholder
  return 0;
}

// Setup Gmail push notifications
export async function setupGmailWatch(userId: string): Promise<boolean> {
  try {
    // Create Gmail client
    const gmailClient = await createGmailClientForUser(userId);
    if (!gmailClient) {
      console.error(`Failed to create Gmail client for user ${userId}`);
      return false;
    }

    // Check if there's an existing active watch
    const existingWatch = await getGmailWatchByUserId({ userId });
    if (existingWatch && existingWatch.active && existingWatch.expiresAt > new Date()) {
      console.log(`Active Gmail watch already exists for user ${userId}`);
      return true;
    }

    // If there's an existing watch but it's inactive or expired, stop it first
    if (existingWatch) {
      try {
        await gmailClient.stopWatch();
        await updateGmailWatchStatus({ id: existingWatch.id, active: false });
      } catch (error) {
        console.error('Error stopping existing watch:', error);
        // Continue anyway to try to create a new watch
      }
    }

    // Set up a label for car dealer emails if it doesn't exist
    let carDealerLabel;
    const labels = await gmailClient.getLabels();
    const existingLabel = labels.find((label: any) => label.name === 'Savvo/CarDealers');
    
    if (existingLabel) {
      carDealerLabel = existingLabel.id;
    } else {
      const newLabel = await gmailClient.createLabel('Savvo/CarDealers');
      carDealerLabel = newLabel.id;
    }

    // Setup the watch
    const TOPIC_NAME = process.env.GMAIL_PUBSUB_TOPIC;
    if (!TOPIC_NAME) {
      throw new Error('GMAIL_PUBSUB_TOPIC environment variable is not set');
    }
    const watch = await gmailClient.setupWatch(TOPIC_NAME, carDealerLabel ? [carDealerLabel] : []);
    
    // Save watch details to database
    await saveGmailWatch({
      userId,
      historyId: watch.historyId ?? null,
      topicName: TOPIC_NAME,
      expiresAt: watch.expiration,
      labels: carDealerLabel ? JSON.stringify([carDealerLabel]) : null,
      updatedAt: new Date(),
    });

    console.log(`Gmail watch set up successfully for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error setting up Gmail watch:', error);
    return false;
  }
}

// Refresh expired Gmail watches
export async function refreshExpiredWatches(): Promise<number> {
  try {
    // Get all active watches with users
    const watches = await getAllActiveGmailWatches();
    let refreshedCount = 0;

    for (const watch of watches) {
      // Skip if not expired or close to expiry (within 24 hours)
      const expiresAt = new Date(watch.GmailWatches.expiresAt);
      const expiresIn24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      if (expiresAt > expiresIn24Hours) {
        continue;
      }
      
      // Refresh this watch
      const success = await setupGmailWatch(watch.GmailWatches.userId);
      if (success) {
        refreshedCount++;
      }
    }

    return refreshedCount;
  } catch (error) {
    console.error('Error refreshing expired Gmail watches:', error);
    return 0;
  }
}

// Process new messages from history updates
export async function processHistoryUpdate(userId: string, historyId: string): Promise<boolean> {
  try {
    // Get the last known history ID
    const watch = await getGmailWatchByUserId({ userId });
    if (!watch || !watch.historyId) {
      console.error(`No watch history found for user ${userId}`);
      return false;
    }

    // Create Gmail client
    const gmailClient = await createGmailClientForUser(userId);
    if (!gmailClient) {
      console.error(`Failed to create Gmail client for user ${userId}`);
      return false;
    }

    // Get history since last known ID
    const history = await gmailClient.getHistory(watch.historyId);
    if (!history || history.length === 0) {
      console.log(`No history updates for user ${userId}`);
      return true;
    }

    // Process each history record
    for (const record of history) {
      // Look for added messages
      if (record.messagesAdded) {
        for (const messageAdded of record.messagesAdded) {
          if (!messageAdded?.message?.threadId) {
            console.log('Skipping message with no thread ID');
            continue;
          }

          // Find conversation by thread ID
          const thread = await findThreadByThreadId(messageAdded.message.threadId);
          if (!thread) {
            console.log(`No matching conversation found for thread ${messageAdded.message.threadId}`);
            continue;
          }

          // Process messages for this conversation
          await processNewMessages(userId, thread.id);
        }
      }
    }

    // Update the history ID
    await saveGmailWatch({
      userId,
      historyId: historyId, // Use the new history ID from the notification
      topicName: watch.topicName,
      expiresAt: watch.expiresAt,
      labels: watch.labels,
      updatedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Error processing history update:', error);
    return false;
  }
}

// Helper to find thread by Gmail thread ID
async function findThreadByThreadId(threadId: string) {
  try {
    return await getThreadByExternalId({ externalSystemId: threadId });
  } catch (error) {
    console.error('Error finding thread by thread ID:', error);
    return null;
  }
} 