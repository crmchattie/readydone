import { GmailClient } from './client';
import { 
  getUserOAuthCredentialsByUserId,
  saveGmailWatch,
  getGmailWatchByUserId,
  updateGmailWatchStatus,
  getAllActiveGmailWatches,
  getThread,
  saveThread,
  saveThreadMessages,
  getMessagesByThreadId,
  updateThreadStatus,
  getThreadByExternalId,
  getExternalPartyByEmail,
  saveExternalParty,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

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
      const isInbound = !message.from.includes(userId);

      if (isInbound) {
        // Save the message to our database
        await saveThreadMessages({
          messages: [{
            threadId,
            externalMessageId: message.id,
            role: 'external',
            subject: message.subject,
            content: { text: message.body }
          }]
        });

        // Update the thread with latest message preview
        await updateThreadStatus({
          threadId,
          status: 'awaiting_reply',
          lastMessagePreview: `New message from ${message.from.split('<')[0].trim()}`
        });
      }
    }

    return newMessages.length > 0;
  } catch (error) {
    console.error('Error processing new messages:', error);
    return false;
  }
}

export async function initiateThread(
  userId: string,
  recipientEmail: string,
  subject: string,
  initialMessage: string,
  chatId: string
): Promise<string> {
  try {
    // Create Gmail client
    const gmailClient = await createGmailClientForUser(userId);
    if (!gmailClient) {
      throw new Error('Failed to create Gmail client');
    }

    // Get or create external party
    let externalParty = await getExternalPartyByEmail({ email: recipientEmail });
    if (!externalParty) {
      // Create new external party
      await saveExternalParty({
        name: recipientEmail.split('@')[0], // Basic name from email
        email: recipientEmail,
        type: 'business', // Default type
        phone: null,
        address: null,
        latitude: null,
        longitude: null,
        website: null
      });
      externalParty = await getExternalPartyByEmail({ email: recipientEmail });
      if (!externalParty) {
        throw new Error('Failed to create external party');
      }
    }

    // Send the initial message
    const sentMessage = await gmailClient.sendMessage({
      to: recipientEmail,
      subject,
      body: initialMessage
    });

    if (!sentMessage.threadId) {
      throw new Error('Failed to send message: No thread ID returned');
    }

    // Create a new thread
    const result = await saveThread({
      id: generateUUID(),
      chatId,
      externalPartyId: externalParty.id,
      name: subject,
      externalSystemId: sentMessage.threadId,
      status: 'awaiting_reply',
      lastMessagePreview: 'Initial message sent'
    });

    // Get the thread ID from the result
    const newThreadId = result[0]?.id;
    if (!newThreadId) {
      throw new Error('Failed to create thread: No ID returned');
    }

    // Save the sent message
    await saveThreadMessages({
      messages: [{
        threadId: newThreadId,
        externalMessageId: sentMessage.id || null,
        role: 'user',
        subject,
        content: { text: initialMessage }
      }]
    });

    return newThreadId;
  } catch (error) {
    console.error('Error initiating thread:', error);
    throw error;
  }
}

export async function setupGmailWatch(userId: string): Promise<boolean> {
  try {
    // Create Gmail client
    const gmailClient = await createGmailClientForUser(userId);
    if (!gmailClient) {
      return false;
    }

    // Check if watch already exists and isn't close to expiring
    const existingWatch = await getGmailWatchByUserId({ userId });
    const EXPIRATION_BUFFER_MS = 24 * 60 * 60 * 1000; // 24 hours buffer
    const now = new Date();
    
    if (existingWatch && existingWatch.active) {
      // If watch exists but is close to expiring, refresh it
      if (existingWatch.expiresAt.getTime() - now.getTime() > EXPIRATION_BUFFER_MS) {
        return true;
      }
    }

    // Set up Gmail push notifications
    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topicName) {
      throw new Error('GMAIL_PUBSUB_TOPIC environment variable not set');
    }

    const watchResponse = await gmailClient.setupWatch(topicName);
    if (!watchResponse) {
      return false;
    }

    // Calculate expiration with a default 7-day window if not provided
    const expirationMs = watchResponse.expiration ? 
      Number(watchResponse.expiration) : 
      Date.now() + 7 * 24 * 60 * 60 * 1000;
    
    // Save watch details
    await saveGmailWatch({
      userId,
      historyId: watchResponse.historyId || '',
      expiresAt: new Date(expirationMs),
      topicName,
      active: true,
      labels: null,
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error setting up Gmail watch:', error);
    return false;
  }
}

export async function refreshExpiredWatches(): Promise<number> {
  try {
    const watches = await getAllActiveGmailWatches();
    let refreshed = 0;
    const EXPIRATION_BUFFER_MS = 24 * 60 * 60 * 1000; // 24 hours buffer
    const now = new Date();

    for (const watch of watches) {
      // Refresh if expired or close to expiring
      if (watch.GmailWatches.expiresAt.getTime() - now.getTime() <= EXPIRATION_BUFFER_MS) {
        // Try to refresh the watch
        const success = await setupGmailWatch(watch.User.id);
        if (success) {
          refreshed++;
        } else {
          // Mark as inactive if refresh failed
          await updateGmailWatchStatus({
            id: watch.GmailWatches.id,
            active: false
          });
        }
      }
    }

    return refreshed;
  } catch (error) {
    console.error('Error refreshing expired watches:', error);
    return 0;
  }
}

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
      return false;
    }

    // Get history since last known ID
    const history = await gmailClient.getHistory(watch.historyId);
    if (!history || history.length === 0) {
      return true;
    }

    // Process history records in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < history.length; i += BATCH_SIZE) {
      const batch = history.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (record) => {
        // Handle added messages
        if (record.messagesAdded) {
          await Promise.all(record.messagesAdded.map(async (messageAdded) => {
            if (!messageAdded?.message?.threadId) return;

            const thread = await getThreadByExternalId({ 
              externalSystemId: messageAdded.message.threadId 
            });
            
            if (thread) {
              await processNewMessages(userId, thread.id);
            }
          }));
        }

        // Handle deleted messages
        if (record.messagesDeleted) {
          await Promise.all(record.messagesDeleted.map(async (messageDeleted) => {
            if (!messageDeleted?.message?.threadId) return;

            const thread = await getThreadByExternalId({ 
              externalSystemId: messageDeleted.message.threadId 
            });
            
            if (thread) {
              // Mark message as deleted in our system
              await updateThreadStatus({
                threadId: thread.id,
                lastMessagePreview: 'Message was deleted in Gmail',
              });
            }
          }));
        }
      }));
    }

    // Update the history ID
    await saveGmailWatch({
      userId,
      historyId,
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