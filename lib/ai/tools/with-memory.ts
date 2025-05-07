import { tool, Message, generateText } from 'ai';
import { z } from 'zod';
import { summarizeMessages } from '@/app/(chat)/actions';
import { createResource, findRelevantContent } from '@/lib/db/queries';
import { myProvider } from '@/lib/ai/providers';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Memory Tool] ${message}`, data ? data : '');
};

interface MemoryToolsProps {
  chatId: string;
  messages: Message[];
  userId: string;
}

async function mergeMemories(existingMemory: string, newMemory: string): Promise<string> {
  debug('Starting memory merge', {
    existingMemoryLength: existingMemory.length,
    newMemoryLength: newMemory.length
  });

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

  debug('Memory merge completed', { mergedMemoryLength: mergedMemory.length });
  return mergedMemory;
}

export const retrieveMemory = ({ chatId, messages, userId }: MemoryToolsProps) =>
  tool({
    description: 'Retrieve relevant memories from previous conversations based on the current context',
    parameters: z.object({
      query: z.string().describe('A detailed query describing what information you are looking for.'),
    }),
    execute: async ({ query }) => {
      debug('Starting memory retrieval', { query });
      try {
        debug('Filtering user messages');
        const userMessages = messages.filter(msg => msg.role === 'user');
        debug('User messages filtered', { messageCount: userMessages.length });
        
        debug('Generating current context summary');
        const currentContext = await summarizeMessages(
          chatId,
          'Summarize the conversation focusing on key topics, decisions, and important details from this user:'
        );
        debug('Context summary generated', { contextLength: currentContext.length });
        
        const enhancedQuery = `${query}\n\nCurrent context:\n${currentContext}`;
        debug('Enhanced query created', { enhancedQueryLength: enhancedQuery.length });
        
        debug('Finding relevant content');
        const relevantContent = await findRelevantContent(enhancedQuery, userId);
        debug('Content search completed', { resultCount: relevantContent.length });
        
        if (relevantContent.length === 0) {
          debug('No relevant memories found');
          return 'No relevant memories found.';
        }

        debug('Memory retrieval completed successfully');
        return `Current context:\n${currentContext}\n\nRelevant memories:\n${
          relevantContent.map(content => content.content).join('\n\n')
        }`;
      } catch (error) {
        debug('Memory retrieval failed', { error: error instanceof Error ? error.message : 'Unknown error' });
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
      debug('Starting memory storage', { hasPrompt: !!prompt });
      try {
        debug('Filtering user messages');
        const userMessages = messages.filter(msg => msg.role === 'user');
        debug('User messages filtered', { messageCount: userMessages.length });
        
        debug('Generating new memory');
        const newMemory = await summarizeMessages(
          chatId,
          prompt || 'Extract new, important information from this user that would be valuable to remember for future interactions.'
        );
        debug('New memory generated', { memoryLength: newMemory.length });
        
        debug('Checking for similar memories');
        const existingMemories = await findRelevantContent(newMemory, userId, 1);
        debug('Similar memories check completed', { 
          hasExisting: existingMemories.length > 0,
          similarity: existingMemories[0]?.similarity
        });
        
        if (existingMemories.length > 0 && existingMemories[0].similarity > 0.7) {
          debug('Merging with existing memory', { similarity: existingMemories[0].similarity });
          const mergedMemory = await mergeMemories(existingMemories[0].content, newMemory);
          
          debug('Storing merged memory');
          await createResource({
            content: mergedMemory,
            url: 'memory',
            title: 'Conversation Memory',
            userId,
          });
          debug('Merged memory stored successfully');
          
          return `Updated existing memory with new information: ${mergedMemory}`;
        } else {
          debug('Storing new memory');
          await createResource({
            content: newMemory,
            url: 'memory',
            title: 'Conversation Memory',
            userId,
          });
          debug('New memory stored successfully');
          return `Memory stored: ${newMemory}`;
        }
      } catch (error) {
        debug('Memory storage failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        console.error('Failed to store memory:', error);
        throw error;
      }
    },
  }); 