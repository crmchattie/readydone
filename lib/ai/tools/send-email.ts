import { tool, generateText } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { createGmailClientForUser } from '@/lib/gmail/service';

interface EmailTaskContext {
  taskType: string;          // e.g., "follow_up", "quote_request", "appointment_confirmation"
  recipientName?: string;    // Name of the recipient
  businessName?: string;     // The business being emailed
  businessType?: string;     // Type of business
  userGoal: string;         // The specific goal of the email
  requiredInfo?: string[];  // Any information needed to complete the task
  constraints?: string[];   // Any constraints or preferences
  tone?: string;           // e.g., "professional", "friendly", "formal"
  urgency?: string;        // e.g., "high", "medium", "low"
}

async function generateEmailSubject(context: EmailTaskContext) {
  const { text } = await generateText({
    model: myProvider.languageModel('chat-model'),
    system: `You are an AI assistant crafting an email subject line. Create a clear, professional subject that:
    1. Is concise and to the point
    2. Clearly indicates the purpose of the email
    3. Creates appropriate urgency if needed
    4. Avoids spam trigger words
    5. Is optimized for mobile viewing (under 50 characters if possible)
    
    Consider the following context:
    - Task Type: ${context.taskType}
    - Business: ${context.businessName || 'the business'}
    - Goal: ${context.userGoal}
    - Urgency: ${context.urgency || 'normal'}`,
    prompt: `Generate a subject line for an email to ${context.businessName || 'a ' + context.businessType} regarding ${context.userGoal}.`,
  });

  return text.trim();
}

async function generateEmailBody(context: EmailTaskContext, subject: string) {
  const { text } = await generateText({
    model: myProvider.languageModel('chat-model'),
    system: `You are an AI assistant composing a professional email. Create content that:
    1. Opens with an appropriate greeting
    2. States the purpose clearly and concisely
    3. Provides all necessary information
    4. Maintains appropriate tone (${context.tone || 'professional'})
    5. Includes a clear call to action
    6. Closes professionally
    7. Uses appropriate formatting and structure
    
    Consider the following context:
    - Task Type: ${context.taskType}
    - Recipient: ${context.recipientName || 'the recipient'}
    - Business: ${context.businessName || context.businessType}
    - Goal: ${context.userGoal}
    ${context.requiredInfo ? `\nRequired Information:\n${context.requiredInfo.join('\n')}` : ''}
    ${context.constraints ? `\nConstraints:\n${context.constraints.join('\n')}` : ''}`,
    prompt: `Write a complete email body for an email with subject "${subject}" to ${context.businessName || 'a ' + context.businessType} regarding ${context.userGoal}.`,
  });

  return text.trim();
}

export const sendEmail = tool({
  description: 'Send an email using Gmail API',
  parameters: z.object({
    userId: z.string().describe('The user ID to send the email from'),
    to: z.string().describe('The recipient email address'),
    taskContext: z.object({
      taskType: z.string(),
      recipientName: z.string().optional(),
      businessName: z.string().optional(),
      businessType: z.string().optional(),
      userGoal: z.string(),
      requiredInfo: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      tone: z.string().optional(),
      urgency: z.string().optional(),
    }).describe('Context about the task being performed in the email'),
    cc: z.array(z.string()).optional().describe('CC recipients'),
    bcc: z.array(z.string()).optional().describe('BCC recipients'),
    attachments: z.array(z.object({
      filename: z.string(),
      content: z.string(), // Base64 encoded content
      contentType: z.string()
    })).optional().describe('Any attachments to include'),
  }),
  execute: async ({ userId, to, taskContext, cc, bcc, attachments }) => {
    try {
      // Generate email subject and body based on the task context
      const subject = await generateEmailSubject(taskContext);
      const body = await generateEmailBody(taskContext, subject);

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

      return {
        success: true,
        message: `Email sent successfully to ${to}`,
        messageId: result.id,
        threadId: result.threadId,
        subject,
        preview: body.substring(0, 100) + '...'
      };

    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  },
}); 