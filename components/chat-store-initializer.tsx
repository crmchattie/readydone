'use client';

import { useEffect } from 'react';
import { UIMessage } from 'ai';
import { Chat, Thread } from '@/lib/db/schema';
import { useChatStore } from '@/lib/stores/chat-store';

interface ChatStoreInitializerProps {
  chat: Chat;
  messages: UIMessage[];
  threads?: Thread[];
}

export function ChatStoreInitializer({ chat, messages, threads }: ChatStoreInitializerProps) {
  const { 
    setCurrentChat, 
    setCurrentChatMessages, 
    setThreads,
    prefetchThreadMessages 
  } = useChatStore();

  useEffect(() => {
    setCurrentChat(chat);
    setCurrentChatMessages(messages);
    
    if (threads) {
      setThreads(threads);
      // Prefetch messages for all threads
      prefetchThreadMessages(threads);
    }
  }, [chat, messages, threads, setCurrentChat, setCurrentChatMessages, setThreads, prefetchThreadMessages]);

  return null;
} 