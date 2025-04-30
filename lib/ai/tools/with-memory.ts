import { tool, Message, generateText } from 'ai';
import { z } from 'zod';
import { summarizeMessages } from '@/app/(chat)/actions';
import { createResource, findRelevantContent } from '@/lib/db/queries';
import { myProvider } from '@/lib/ai/providers';

interface MemoryToolsProps {
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

export const retrieveMemory = ({ messages, userId }: MemoryToolsProps) =>
  tool({
    description: 'Retrieve relevant memories from previous conversations based on the current context',
    parameters: z.object({
      query: z.string().describe('A detailed query describing what information you are looking for. Include specific topics, keywords, or context that will help find relevant memories.'),
    }),
    execute: async ({ query }) => {
      try {
        const conversationSummary = await summarizeMessages(
          messages,
          'Summarize the current conversation, focusing on key topics, decisions, and important details that might be relevant for future reference:'
        );
        
        const enhancedQuery = `${query}\n\nContext from current conversation:\n${conversationSummary}`;
        const relevantContent = await findRelevantContent(enhancedQuery, userId);
        
        if (relevantContent.length === 0) {
          return 'No relevant memories found.';
        }

        return `Current conversation context:\n${conversationSummary}\n\nRelevant memories:\n${relevantContent.map(content => content.content).join('\n\n')}`;
      } catch (error) {
        console.error('Failed to retrieve memory:', error);
        throw error;
      }
    },
  });

export const storeMemory = ({ messages, userId }: MemoryToolsProps) =>
  tool({
    description: 'Store important information from the current conversation for future reference',
    parameters: z.object({
      prompt: z.string().optional().describe('Optional prompt to guide the summarization'),
    }),
    execute: async ({ prompt }) => {
      try {
        const summary = await summarizeMessages(
          messages,
          prompt || 'Extract and summarize the most important information from this conversation that would be valuable to remember for future reference. Focus on key decisions, insights, and actionable items'
        );
        
        // Check for existing similar memories
        const existingMemories = await findRelevantContent(summary, userId, 1);
        
        if (existingMemories.length > 0 && existingMemories[0].similarity > 0.7) {
          // If we found a highly similar memory, merge them
          const mergedMemory = await mergeMemories(existingMemories[0].content, summary);
          
          // Update the existing memory with the merged content
          await createResource({
            content: mergedMemory,
            url: 'memory',
            title: 'Conversation Memory',
            userId,
          });
          
          return `Updated existing memory with new information: ${mergedMemory}`;
        } else {
          // Create a new memory
          await createResource({
            content: summary,
            url: 'memory',
            title: 'Conversation Memory',
            userId,
          });
          return `Memory stored: ${summary}`;
        }
      } catch (error) {
        console.error('Failed to store memory:', error);
        throw error;
      }
    },
  }); 