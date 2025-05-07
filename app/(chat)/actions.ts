'use server';

import { generateText, Message } from 'ai';
import { cookies } from 'next/headers';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
  getLatestChatSummary,
  getMessagesByChatId,
} from '@/lib/db/queries';
import { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import type { ArtifactKind } from '@/components/artifact';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function summarizeMessages(
  chatId: string,
  prompt: string
): Promise<string> {
  // Get the latest summary if it exists
  const latestSummary = await getLatestChatSummary({ chatId });
  
  // Get all messages since the last summary
  const messages = await getMessagesByChatId({ id: chatId });
  const unsummarizedMessages = latestSummary 
    ? messages.filter(msg => msg.id !== latestSummary.lastMessageId && 
        msg.createdAt > latestSummary.createdAt)
    : messages;

  if (unsummarizedMessages.length === 0) {
    return latestSummary?.summary || '';
  }

  const context = latestSummary 
    ? `Previous summary:\n${latestSummary.summary}\n\nNew messages to incorporate:`
    : 'Summarize these messages:';

  const { text } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: 'You are a conversation summarizer. Create concise but informative summaries that capture key points, decisions, and context.',
    prompt: `${context}\n\n${unsummarizedMessages
      .map(msg => `${msg.role}: ${JSON.stringify(msg.parts)}`)
      .join('\n')}\n\n${prompt}`,
  });

  return text;
}

export async function generateDocumentSummary(content: string, kind: ArtifactKind): Promise<string> {
  const prompt = kind === 'code' 
    ? 'Summarize this code snippet focusing on its main functionality and purpose:'
    : kind === 'sheet'
    ? 'Summarize this spreadsheet data focusing on its structure and key information:'
    : 'Summarize this text focusing on its main points and key information:';

  const { text } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: 'You are a document summarization assistant. Create concise, informative summaries that capture the essence of the content.',
    prompt: `${prompt}\n\n${content}`,
  });

  return text;
} 
