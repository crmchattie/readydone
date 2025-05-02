import { tool, Message, generateText } from 'ai';
import { z } from 'zod';
import { summarizeMessages } from '@/app/(chat)/actions';
import { createResource, findRelevantContent } from '@/lib/db/queries';
import { myProvider } from '@/lib/ai/providers';

interface MemoryToolsProps {
  chatId: string;
  messages: Message[];
  userId: string;
}

async function mergeMemories(existingMemory: string, newMemory: string): Promise<string> {
  const { text: mergedMemory } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: `You are a memory consolidation assistant. Your task is to merge two pieces of information about the same topic, ensuring no important details are lost while avoiding redundancy.`,
    prompt: `Merge these two pieces of information about the same topic. Keep all unique and important details while removing redundant information. If there are conflicting details, prefer the newer information.

Existing memory:
${existingMemory}

New memory:
${newMemory}

Merged memory:`,
  });

  return mergedMemory;
}

export const retrieveMemory = ({ chatId, messages, userId }: MemoryToolsProps) =>
  tool({
    description: 'Retrieve relevant memories from previous conversations based on the current context',
    parameters: z.object({
      query: z.string().describe('A detailed query describing what information you are looking for.'),
    }),
    execute: async ({ query }) => {
      try {
        // Filter messages to only include those from this user
        const userMessages = messages.filter(msg => msg.role === 'user');
        
        // Generate a summary of the user's messages
        const currentContext = await summarizeMessages(
          userMessages,
          'Summarize the conversation focusing on key topics, decisions, and important details from this user:'
        );
        
        const enhancedQuery = `${query}\n\nCurrent context:\n${currentContext}`;
        
        const relevantContent = await findRelevantContent(enhancedQuery, userId);
        
        if (relevantContent.length === 0) {
          return 'No relevant memories found.';
        }

        return `Current context:\n${currentContext}\n\nRelevant memories:\n${
          relevantContent.map(content => content.content).join('\n\n')
        }`;
      } catch (error) {
        console.error('Failed to retrieve memory:', error);
        throw error;
      }
    },
  });

export const storeMemory = ({ chatId, messages, userId }: MemoryToolsProps) =>
  tool({
    description: 'Store important information from the current conversation for future reference',
    parameters: z.object({
      prompt: z.string().optional().describe('Optional prompt to guide what information should be stored'),
    }),
    execute: async ({ prompt }) => {
      try {
        // Filter messages to only include those from this user
        const userMessages = messages.filter(msg => msg.role === 'user');
        
        // Generate new memory focusing on what's new/important
        const newMemory = await summarizeMessages(
          userMessages,
          prompt || 'Extract new, important information from this user that would be valuable to remember for future interactions.'
        );
        
        // Check for similar existing memories
        const existingMemories = await findRelevantContent(newMemory, userId, 1);
        
        if (existingMemories.length > 0 && existingMemories[0].similarity > 0.7) {
          const mergedMemory = await mergeMemories(existingMemories[0].content, newMemory);
          
          await createResource({
            content: mergedMemory,
            url: 'memory',
            title: 'Conversation Memory',
            userId,
          });
          
          return `Updated existing memory with new information: ${mergedMemory}`;
        } else {
          await createResource({
            content: newMemory,
            url: 'memory',
            title: 'Conversation Memory',
            userId,
          });
          return `Memory stored: ${newMemory}`;
        }
      } catch (error) {
        console.error('Failed to store memory:', error);
        throw error;
      }
    },
  }); 