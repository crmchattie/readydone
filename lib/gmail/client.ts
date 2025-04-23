import { google } from 'googleapis';
import { UserOAuthCredentials } from '@/lib/db/schema';
import { updateUserOAuthCredentials } from '@/lib/db/queries';

interface GmailCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export class GmailClient {
  private oauth2Client;
  private gmail;
  private userId: string;
  private credentials: GmailCredentials;
  private credentialId: string;

  constructor(
    userId: string,
    credentials: GmailCredentials,
    credentialId: string
  ) {
    this.userId = userId;
    this.credentials = credentials;
    this.credentialId = credentialId;

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiresAt ? credentials.expiresAt.getTime() : undefined
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // Check if token needs refresh and handle it
  private async ensureValidToken() {
    const isTokenExpired = this.credentials.expiresAt && this.credentials.expiresAt < new Date();
    
    if (isTokenExpired && this.credentials.refreshToken) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        // Update database with new token
        await updateUserOAuthCredentials({
          id: String(this.credentialId),
          accessToken: credentials.access_token!,
          refreshToken: credentials.refresh_token || this.credentials.refreshToken,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
        });

        // Update local credentials
        this.credentials = {
          accessToken: credentials.access_token!,
          refreshToken: credentials.refresh_token || this.credentials.refreshToken,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
        };

        // Update oauth client with new credentials
        this.oauth2Client.setCredentials({
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || this.credentials.refreshToken,
          expiry_date: credentials.expiry_date
        });
      } catch (error) {
        console.error('Error refreshing access token:', error);
        throw new Error('Failed to refresh access token');
      }
    }
  }

  // Helper function to decode Gmail messages
  private decodeBase64Url(data: string) {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  // Fetch messages from a thread
  async getMessageThread(threadId: string) {
    await this.ensureValidToken();
    
    try {
      const thread = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId
      });
      
      return thread.data;
    } catch (error) {
      console.error('Error fetching message thread:', error);
      throw new Error('Failed to fetch message thread');
    }
  }

  // Fetch all threads matching a query
  async listThreads(query: string, maxResults = 10) {
    await this.ensureValidToken();
    
    try {
      const response = await this.gmail.users.threads.list({
        userId: 'me',
        q: query,
        maxResults
      });
      
      return response.data.threads || [];
    } catch (error) {
      console.error('Error listing threads:', error);
      throw new Error('Failed to list threads');
    }
  }

  // Extract message content (body, subject, etc.)
  extractMessageContent(message: any) {
    const headers = message.payload.headers;
    
    const subject = headers.find((header: any) => header.name === 'Subject')?.value || '';
    const from = headers.find((header: any) => header.name === 'From')?.value || '';
    const to = headers.find((header: any) => header.name === 'To')?.value || '';
    const date = headers.find((header: any) => header.name === 'Date')?.value || '';
    
    let body = '';
    
    // Function to recursively extract parts
    const extractParts = (part: any) => {
      if (part.mimeType === 'text/plain' && part.body.data) {
        body += this.decodeBase64Url(part.body.data);
      } else if (part.parts) {
        part.parts.forEach(extractParts);
      }
    };
    
    if (message.payload.body.data) {
      body = this.decodeBase64Url(message.payload.body.data);
    } else if (message.payload.parts) {
      message.payload.parts.forEach(extractParts);
    }
    
    return {
      id: message.id,
      threadId: message.threadId,
      subject,
      from,
      to,
      date: new Date(date),
      body,
      raw: message
    };
  }

  // Send a message
  async sendMessage({ to, subject, body }: { to: string; subject: string; body: string }) {
    await this.ensureValidToken();
    
    try {
      const message = [
        'From: me',
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');
      
      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const res = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });
      
      return res.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Reply to a message
  async replyToMessage({
    threadId,
    messageId,
    to,
    subject,
    body
  }: {
    threadId: string;
    messageId: string;
    to: string;
    subject: string;
    body: string;
  }) {
    await this.ensureValidToken();
    
    try {
      // Get the original message to extract headers
      const originalMessage = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId
      });
      
      const headers = originalMessage.data.payload?.headers || [];
      const references = headers.find((header: any) => header.name === 'References')?.value || '';
      const inReplyTo = headers.find((header: any) => header.name === 'Message-ID')?.value || '';
      
      // Create reply with appropriate headers
      const message = [
        'From: me',
        `To: ${to}`,
        `Subject: Re: ${subject}`,
        `References: ${references} ${inReplyTo}`.trim(),
        `In-Reply-To: ${inReplyTo}`,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        body
      ].join('\n');
      
      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const res = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId
        }
      });
      
      return res.data;
    } catch (error) {
      console.error('Error replying to message:', error);
      throw new Error('Failed to reply to message');
    }
  }

  // Check for new messages in a thread since a given messageId
  async checkForNewMessages(threadId: string, lastKnownMessageId: string) {
    const thread = await this.getMessageThread(threadId);
    const messages = thread.messages || [];
    
    // Find the index of the last known message
    const lastMessageIndex = messages.findIndex((msg: any) => msg.id === lastKnownMessageId);
    
    if (lastMessageIndex === -1) {
      // Last message not found - return all messages
      return messages.map((msg: any) => this.extractMessageContent(msg));
    }
    
    // Get all messages after the last known one
    const newMessages = messages.slice(lastMessageIndex + 1);
    return newMessages.map((msg: any) => this.extractMessageContent(msg));
  }

  // Set up Gmail push notifications using watch
  async setupWatch(topicName: string, labelIds: string[] = []) {
    await this.ensureValidToken();
    
    try {
      const response = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName,
          labelIds: labelIds.length > 0 ? labelIds : undefined,
        }
      });
      
      // Return the watch response including historyId and expiration
      return {
        historyId: response.data.historyId,
        expiration: response.data.expiration 
          ? new Date(parseInt(response.data.expiration)) 
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days if not provided
      };
    } catch (error) {
      console.error('Error setting up Gmail watch:', error);
      throw new Error('Failed to set up Gmail watch notification');
    }
  }

  // Stop Gmail push notifications
  async stopWatch() {
    await this.ensureValidToken();
    
    try {
      await this.gmail.users.stop({
        userId: 'me'
      });
      
      return true;
    } catch (error) {
      console.error('Error stopping Gmail watch:', error);
      throw new Error('Failed to stop Gmail watch notification');
    }
  }

  // Create a label in Gmail
  async createLabel(labelName: string) {
    await this.ensureValidToken();
    
    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating Gmail label:', error);
      throw new Error('Failed to create Gmail label');
    }
  }

  // Get all labels in Gmail
  async getLabels() {
    await this.ensureValidToken();
    
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });
      
      return response.data.labels || [];
    } catch (error) {
      console.error('Error getting Gmail labels:', error);
      throw new Error('Failed to get Gmail labels');
    }
  }

  // Apply a label to a message
  async applyLabel(messageId: string, labelId: string) {
    await this.ensureValidToken();
    
    try {
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error applying label to message:', error);
      throw new Error('Failed to apply label to message');
    }
  }

  // Get history based on historyId
  async getHistory(startHistoryId: string) {
    await this.ensureValidToken();
    
    try {
      const response = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId
      });
      
      return response.data.history || [];
    } catch (error) {
      console.error('Error getting Gmail history:', error);
      throw new Error('Failed to get Gmail history');
    }
  }

  // Get all messages in a thread
  async getThreadMessages(threadId: string) {
    await this.ensureValidToken();
    
    try {
      const thread = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId,
      });
      
      return thread.data.messages || [];
    } catch (error) {
      console.error('Error getting thread messages:', error);
      throw new Error('Failed to get thread messages');
    }
  }

  // Send a reply in a thread
  async sendReply({
    to,
    subject,
    body,
    threadId,
  }: {
    to: string;
    subject: string;
    body: string;
    threadId: string;
  }) {
    await this.ensureValidToken();
    
    try {
      // Create the email content
      const emailLines = [];
      emailLines.push(`To: ${to}`);
      emailLines.push(`Subject: ${subject}`);
      emailLines.push('Content-Type: text/plain; charset=utf-8');
      emailLines.push('MIME-Version: 1.0');
      emailLines.push('');
      emailLines.push(body);
      
      // Encode the email in base64
      const email = Buffer.from(emailLines.join('\r\n')).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Send the message
      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: email,
          threadId,
        },
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      throw new Error('Failed to send reply');
    }
  }
} 