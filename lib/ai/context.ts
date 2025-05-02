import { Message } from 'ai';
import { db } from '@/lib/db';
import { chatSummaries } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { summarizeMessages } from '@/app/(chat)/actions';

export interface ConversationContext {
  historicalContext: string | null;
  recentContext: string | null;
}

export async function getContextForInteraction(chatId: string, messages: Message[]): Promise<ConversationContext> {
  // Get the latest summary
  const summary = await db
    .select()
    .from(chatSummaries)
    .where(eq(chatSummaries.chatId, chatId))
    .orderBy(desc(chatSummaries.createdAt))
    .limit(1);

  if (summary.length === 0) {
    // No summary exists, summarize all messages
    const fullSummary = await summarizeMessages(
      messages,
      'Summarize the conversation focusing on key topics, decisions, and important details:'
    );
    return {
      historicalContext: fullSummary,
      recentContext: null
    };
  }

  // Find messages after the last summary
  const recentMessages = messages.filter(msg => {
    if (!msg.createdAt) return false;
    const msgDate = msg.createdAt instanceof Date ? 
      msg.createdAt : 
      new Date(msg.createdAt);
    return msgDate > summary[0].createdAt;
  });

  if (recentMessages.length === 0) {
    return {
      historicalContext: summary[0].summary,
      recentContext: null
    };
  }

  // Summarize recent messages
  const recentSummary = await summarizeMessages(
    recentMessages,
    'Summarize recent messages focusing on new developments and current context:'
  );

  return {
    historicalContext: summary[0].summary,
    recentContext: recentSummary
  };
} 