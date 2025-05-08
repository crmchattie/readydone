import { tool, generateText, Message } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { getContextForInteraction, type ConversationContext } from '@/lib/ai/context';
import { startCall, getCall } from '../../vapi';
import { saveThread, saveThreadMessages, getExternalPartyByPhone, saveExternalParty, updateThreadStatus } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Call Phone Tool] ${message}`, data ? data : '');
};

type ThreadMessageRole = 'user' | 'ai' | 'external';

async function generateFirstMessage(context: ConversationContext) {
  debug('Generating first message', { contextSummary: context.summary?.substring(0, 100) });
  
  const { text } = await generateText({
    model: myProvider.languageModel('chat-model-large'),
    system: `You are an AI assistant crafting an opening message for a phone call. Generate a professional, natural first message that:
    1. Greets the recipient appropriately
    2. States your name and purpose clearly
    3. Begins addressing the specific task
    
    Consider the following context:
    ${context.summary}${
      context.recentContext ? `\n\nRecent messages:\n${context.recentContext}` : ''
    }
    
    The message should be concise, professional, and focused on the specific task while maintaining a natural, conversational tone.
    DO NOT mention that you are an AI assistant.`,
    prompt: `Generate an appropriate opening message for this phone call based on the context provided.`,
  });

  debug('First message generated', { messageLength: text.length });
  return text.trim();
}

async function generateSystemPrompt(context: ConversationContext) {
  debug('Generating system prompt', { contextSummary: context.summary?.substring(0, 100) });
  
  const { text } = await generateText({
    model: myProvider.languageModel('chat-model-large'),
    system: `Create a system prompt for an AI assistant making a phone call. The prompt should follow this structure:

[Identity]
- Define who you are and your role in this conversation
- Specify your purpose for this specific call
- Set the appropriate tone and demeanor

[Style]
- Be informative yet concise (this is a voice conversation)
- Maintain a professional and natural tone
- Use appropriate pacing and pauses
- Speak clearly and avoid complex jargon

[Response Guidelines]
- Ask one question at a time
- Wait for user responses before proceeding
- Confirm important information explicitly
- Handle silence or unclear responses professionally
- Format numbers and dates for clear verbal communication
- Use appropriate verbal acknowledgments

[Task Breakdown]
1. Introduce yourself and state purpose
2. Verify you're speaking with the right person
3. Address the specific task objectives
4. Handle any questions or concerns
5. Summarize and confirm next steps
6. Close professionally

[Error Handling]
- If the response is unclear, ask for clarification
- If you encounter technical issues, explain and offer alternatives
- Know when to transfer to a human operator
- Handle objections professionally and empathetically

[Success Criteria]
- Clear communication of purpose and outcomes
- Successful completion of task objectives
- Professional handling of any concerns
- Appropriate documentation of important information

Consider this context:
${context.summary}${
      context.recentContext ? `\n\nRecent messages:\n${context.recentContext}` : ''
    }`,
    prompt: `Create a detailed system prompt for an AI assistant that needs to handle this phone call based on the context provided.`,
  });

  debug('System prompt generated', { promptLength: text.length });
  return text.trim();
}

interface CallPhoneProps {
  messages: Message[];
  chatId: string;
}

export const callPhone = ({ chatId, messages }: CallPhoneProps) =>
  tool({
    description: 'Make an outbound phone call using Vapi AI',
    parameters: z.object({
      phoneNumber: z.string().describe('The phone number to call'),
      earliestAt: z.string().optional().describe('ISO 8601 date-time string for earliest call time'),
      latestAt: z.string().optional().describe('ISO 8601 date-time string for latest call time'),
  }),
  execute: async ({ phoneNumber, earliestAt, latestAt }) => {
    debug('Starting phone call execution', { phoneNumber, earliestAt, latestAt });
    
    try {
      debug('Fetching conversation context');
      const context = await getContextForInteraction(chatId, messages);
      debug('Context fetched successfully');

      debug('Generating initial messages');
      const firstMessage = await generateFirstMessage(context);
      const systemPrompt = await generateSystemPrompt(context);
      debug('Initial messages generated');

      // Get or create external party for the phone number
      let externalParty = await getExternalPartyByPhone({ phone: phoneNumber });
      if (!externalParty) {
        await saveExternalParty({
          name: `Phone Contact ${phoneNumber}`, // Basic name from phone number
          email: null,
          phone: phoneNumber,
          type: 'phone_contact',
          address: null,
          latitude: null,
          longitude: null,
          website: null
        });
        externalParty = await getExternalPartyByPhone({ phone: phoneNumber });
      }

      if (!externalParty) {
        throw new Error('Failed to create or retrieve external party');
      }

      // Create thread
      const threadId = generateUUID();
      await saveThread({
        id: threadId,
        chatId,
        externalPartyId: externalParty.id,
        name: `Call to ${phoneNumber}`,
        externalSystemId: undefined, // Will be updated after call creation
        status: 'awaiting_reply',
        lastMessagePreview: firstMessage
      });
      debug('Thread created', { threadId });

      debug('Saving initial message');
      await saveThreadMessages({
        messages: [
          {
            threadId,
            role: 'ai' as const,
            content: firstMessage,
            externalMessageId: null,
            subject: null
          }
        ]
      });
      debug('Initial message saved');

      debug('Initiating Vapi call');
      const call = await startCall({
        phoneNumber,
        firstMessage,
        systemPrompt,
        earliestAt,
        latestAt,
        threadId
      });
      debug('Vapi call initiated', { callId: call.id });

      // Update thread with call ID
      await updateThreadStatus({
        threadId,
        status: 'awaiting_reply',
        lastMessagePreview: firstMessage
      });

      debug('Call execution completed successfully');
      return {
        callId: call.id,
        threadId,
        messages: []
      };

    } catch (error) {
      debug('Call execution failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Failed to make phone call:', error);
      throw error;
    }
  },
});

// Function to save call messages
export const saveCallMessages = async (callId: string, threadId: string) => {
  try {
    const call = await getCall(callId);
    if (!call.messages || !Array.isArray(call.messages)) {
      return;
    }

    const callMessages = call.messages.map(msg => {
      let content = '';
      if ('result' in msg) {
        content = msg.result;
      } else if ('message' in msg) {
        content = msg.message;
      }

      return {
        threadId,
        role: msg.role === 'user' ? 'external' as const : 'ai' as const,
        content,
        externalMessageId: null,
        subject: null
      };
    });

    await saveThreadMessages({
      messages: callMessages
    });
  } catch (error) {
    console.error('Failed to save call messages:', error);
    throw error;
  }
}; 