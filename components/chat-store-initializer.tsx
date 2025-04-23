'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { UIMessage } from 'ai';
import { type Chat } from '@/lib/db/schema';

interface ChatStoreInitializerProps {
  chat: Chat;
  messages: UIMessage[];
}

export function ChatStoreInitializer({ chat, messages }: ChatStoreInitializerProps) {
  const { setCurrentChat, setCurrentChatMessages } = useChatStore();

  useEffect(() => {
    setCurrentChat(chat);
    setCurrentChatMessages(messages);
  }, [chat, messages, setCurrentChat, setCurrentChatMessages]);

  return null;
} 