import { tool, generateText, Message } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { createGmailClientForUser } from '@/lib/gmail/service';
import { getContextForInteraction, type ConversationContext } from '@/lib/ai/context';
import { saveThread, saveThreadMessages, getExternalPartyByEmail, saveExternalParty } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

async function generateEmailSubject(context: ConversationContext) {
  const { text } = await generateText({
    model: myProvider.languageModel('chat-model-large'),
    system: `You are an AI assistant crafting an email subject line. Create a clear, professional subject that:
    1. Is concise and to the point
    2. Clearly indicates the purpose of the email
    3. Creates appropriate urgency if needed
    4. Avoids spam trigger words
    5. Is optimized for mobile viewing (under 50 characters if possible)
    
    Consider the following context:
    ${context.summary}${
      context.recentContext ? `\n\nRecent messages:\n${context.recentContext}` : ''
    }`,
    prompt: `Generate a subject line for this email based on the context provided.`,
  });

  return text.trim();
}

async function generateEmailBody(context: ConversationContext, subject: string) {
  const { text } = await generateText({
    model: myProvider.languageModel('chat-model-large'),
    system: `You are an AI assistant composing a professional email. Create content that:
    1. Opens with an appropriate greeting
    2. States the purpose clearly and concisely
    3. Provides all necessary information
    4. Maintains appropriate tone
    5. Includes a clear call to action
    6. Closes professionally
    7. Uses appropriate formatting and structure
    
    Consider the following context:
    ${context.summary}${
      context.recentContext ? `\n\nRecent messages:\n${context.recentContext}` : ''
    }`,
    prompt: `Write a complete email body for an email with subject "${subject}" based on the context provided.`,
  });

  return text.trim();
}

interface SendEmailProps {
  userId: string;
  messages: Message[];
  chatId: string;
}

export const sendEmail = ({ chatId, messages, userId }: SendEmailProps) =>
  tool({
    description: 'Send an email using Gmail API',
    parameters: z.object({
      to: z.string().describe('The recipient email address'),
      cc: z.array(z.string()).optional().describe('CC recipients'),
      bcc: z.array(z.string()).optional().describe('BCC recipients'),
      attachments: z.array(z.object({
        filename: z.string(),
        content: z.string(), // Base64 encoded content
        contentType: z.string()
    })).optional().describe('Any attachments to include'),
  }),
  execute: async ({ to, cc, bcc, attachments }) => {
    try {
      // Get context once
      const context = await getContextForInteraction(chatId, messages);

      // Generate email subject and body based on the context
      const subject = await generateEmailSubject(context);
      const body = await generateEmailBody(context, subject);

      // Create Gmail client for the user
      const gmailClient = await createGmailClientForUser(userId);
      if (!gmailClient) {
        throw new Error('Failed to create Gmail client');
      }

      // Send the email
      const result = await gmailClient.sendMessage({
        to,
        subject,
        body
      });

      // Get or create external party for the email recipient
      let externalParty = await getExternalPartyByEmail({ email: to });
      if (!externalParty) {
        await saveExternalParty({
          name: to.split('@')[0], // Basic name from email
          email: to,
          type: 'email_contact',
          phone: null,
          address: null,
          latitude: null,
          longitude: null,
          website: null
        });
        externalParty = await getExternalPartyByEmail({ email: to });
      }

      if (!externalParty) {
        throw new Error('Failed to create or retrieve external party');
      }

      // Create a thread for the email exchange
      const threadId = generateUUID();
      await saveThread({
        id: threadId,
        chatId,
        externalPartyId: externalParty.id,
        name: `Email to ${to}`,
        externalSystemId: result.threadId || undefined,
        status: 'awaiting_reply',
        lastMessagePreview: body.substring(0, 100) + '...'
      });

      // Save the email as a thread message
      await saveThreadMessages({
        messages: [{
          threadId,
          role: 'ai' as const,
          content: body,
          externalMessageId: result.id || null,
          subject
        }]
      });

      // Return just the email body
      return body

    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  },
}); 