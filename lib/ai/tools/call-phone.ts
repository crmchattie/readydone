import { tool, generateText } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { getContextForInteraction, type ConversationContext } from '@/lib/ai/context';
import { startCall, endCall } from '../../vapi';

async function generateFirstMessage(context: ConversationContext) {
  const { text } = await generateText({
    model: myProvider.languageModel('chat-model'),
    system: `You are an AI assistant crafting an opening message for a phone call. Generate a professional, natural first message that:
    1. Greets the recipient appropriately
    2. States your name and purpose clearly
    3. Begins addressing the specific task
    
    Consider the following context:
    ${context.historicalContext}${
      context.recentContext ? `\n\nRecent developments:\n${context.recentContext}` : ''
    }
    
    The message should be concise, professional, and focused on the specific task while maintaining a natural, conversational tone.
    DO NOT mention that you are an AI assistant.`,
    prompt: `Generate an appropriate opening message for this phone call based on the context provided.`,
  });

  return text.trim();
}

async function generateSystemPrompt(context: ConversationContext) {
  const { text } = await generateText({
    model: myProvider.languageModel('chat-model'),
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
${context.historicalContext}${
      context.recentContext ? `\n\nRecent developments:\n${context.recentContext}` : ''
    }`,
    prompt: `Create a detailed system prompt for an AI assistant that needs to handle this phone call based on the context provided.`,
  });

  return text.trim();
}

export const callPhone = tool({
  description: 'Make an outbound phone call using Vapi AI',
  parameters: z.object({
    messages: z.array(z.any()).describe('The conversation messages to use for context'),
    chatId: z.string().describe('The chat ID to get context from'),
  }),
  execute: async ({ messages, chatId }) => {
    try {
      // Get context once
      const context = await getContextForInteraction(chatId, messages);

      // Generate the first message and system prompt based on the context
      const firstMessage = await generateFirstMessage(context);
      const systemPrompt = await generateSystemPrompt(context);

      // Start the Vapi call with our generated messages
      const call = await startCall(firstMessage, systemPrompt);
      
      if (!call) {
        throw new Error('Failed to initiate call: No call object returned');
      }

      return {
        success: true,
        message: 'Call initiated successfully',
        callId: call.id,
        firstMessage,
        systemPrompt
      };

    } catch (error) {
      console.error('Failed to make phone call:', error);
      throw error;
    }
  },
}); 