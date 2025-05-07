import { Message } from 'ai';
import { summarizeMessages } from '@/app/(chat)/actions';
import { getLatestChatSummary } from '@/lib/db/queries';

export interface ConversationContext {
  summary: string;
  recentContext: string;
}

export async function getContextForInteraction(chatId: string, messages: Message[]): Promise<ConversationContext> {
  // Get the latest summary
  const summary = await getLatestChatSummary({ chatId });

  // Get recent messages (last 10 messages)
  const recentMessages = messages.slice(-10);
  const recentContext = recentMessages
    .map(msg => `${msg.role}: ${JSON.stringify(msg.parts)}`)
    .join('\n');

  return {
    summary: summary?.summary || '',
    recentContext,
  };
} 