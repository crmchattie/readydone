import { google } from 'googleapis';
import { UserOAuthCredentials } from '@/lib/db/schema';
import { updateUserOAuthCredentials } from '@/lib/db/queries';
import { RateLimiter } from '@/lib/utils';

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
  private rateLimiter: RateLimiter;

  constructor(
    userId: string,
    credentials: GmailCredentials,
    credentialId: string
  ) {
    this.userId = userId;
    this.credentials = credentials;
    this.credentialId = credentialId;
    this.rateLimiter = new RateLimiter({
      maxRequests: 250, // Gmail API quota per user per second
      perSeconds: 100
    });

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
        
        if (!credentials.access_token) {
          throw new Error('No access token returned from refresh');
        }

        // Update database with new token
        await updateUserOAuthCredentials({
          id: String(this.credentialId),
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || this.credentials.refreshToken,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
        });

        // Update local credentials
        this.credentials = {
          accessToken: credentials.access_token,
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
    try {
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (error) {
      console.error('Error decoding base64 data:', error);
      return '';
    }
  }

  // Rate-limited API request wrapper
  private async rateLimitedRequest<T>(
    requestFn: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    await this.rateLimiter.waitForToken();
    try {
      await this.ensureValidToken();
      return await requestFn();
    } catch (error: any) {
      if (error.code === 429) {
        // Rate limit exceeded, wait and retry once
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await requestFn();
      }
      console.error(errorMessage, error);
      throw new Error(`${errorMessage}: ${error.message}`);
    }
  }

  // Fetch messages from a thread
  async getMessageThread(threadId: string) {
    return this.rateLimitedRequest(
      () => this.gmail.users.threads.get({
        userId: 'me',
        id: threadId
      }).then(response => response.data),
      'Failed to fetch message thread'
    );
  }

  // Fetch all threads matching a query
  async listThreads(query: string, maxResults = 10) {
    return this.rateLimitedRequest(
      () => this.gmail.users.threads.list({
        userId: 'me',
        q: query,
        maxResults
      }).then(response => response.data.threads || []),
      'Failed to list threads'
    );
  }

  // Extract message content (body, subject, etc.)
  extractMessageContent(message: any) {
    try {
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
    } catch (error) {
      console.error('Error extracting message content:', error);
      throw new Error('Failed to extract message content');
    }
  }

  // Send a message
  async sendMessage({ to, subject, body }: { to: string; subject: string; body: string }) {
    return this.rateLimitedRequest(
      async () => {
        const message = [
          'From: me',
          `To: ${to}`,
          `Subject: ${subject}`,
          '',
          body
        ].join('\n');
        
        const encodedMessage = Buffer.from(message).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        const res = await this.gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        });
        
        return res.data;
      },
      'Failed to send message'
    );
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

  // Setup Gmail push notifications
  async setupWatch(topicName: string) {
    return this.rateLimitedRequest(
      async () => {
        const res = await this.gmail.users.watch({
          userId: 'me',
          requestBody: {
            topicName,
            labelIds: ['INBOX']
          }
        });
        return res.data;
      },
      'Failed to setup Gmail watch'
    );
  }

  // Stop Gmail push notifications
  async stopWatch() {
    return this.rateLimitedRequest(
      () => this.gmail.users.stop({
        userId: 'me'
      }).then(response => response.data),
      'Failed to stop Gmail watch'
    );
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

  // Get message history
  async getHistory(startHistoryId: string) {
    return this.rateLimitedRequest(
      () => this.gmail.users.history.list({
        userId: 'me',
        startHistoryId
      }).then(response => response.data.history || []),
      'Failed to get message history'
    );
  }

  // Get messages in a thread
  async getThreadMessages(threadId: string) {
    const thread = await this.getMessageThread(threadId);
    return thread.messages || [];
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