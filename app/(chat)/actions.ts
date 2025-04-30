'use server';

import { generateText, Message } from 'ai';
import { cookies } from 'next/headers';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';

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
  messages: Message[],
  prompt: string = 'Summarize the following conversation in a concise manner, capturing the key points and context:'
): Promise<string> {
  try {
    // Sort messages by timestamp (newest first) and limit to last 10 messages
    const recentMessages = messages
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, 10);

    // Format messages and check total length
    let messageContent = '';
    for (const msg of recentMessages) {
      const newContent = `${msg.role}: ${msg.content}\n`;
      // If adding this message would exceed 500,000 characters, stop
      if (messageContent.length + newContent.length > 500_000) {
        break;
      }
      messageContent += newContent;
    }

    const { text } = await generateText({
      model: myProvider.languageModel('chat-model-small'),
      system: prompt,
      prompt: `${messageContent}\n\nSummary:`,
    });

    return text.trim();
  } catch (error) {
    console.error('Failed to summarize messages:', error);
    throw error;
  }
}
