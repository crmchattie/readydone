'use client';

import { useEffect } from 'react';
import { UIMessage } from 'ai';
import { Chat, Thread } from '@/lib/db/schema';
import { useChatStore } from '@/lib/stores/chat-store';

interface ChatStoreInitializerProps {
  chat?: Chat | null;
  messages?: UIMessage[];
  threads?: Thread[];
}

export function ChatStoreInitializer({ 
  chat = null, 
  messages = [], 
  threads = [] 
}: ChatStoreInitializerProps) {
  const { 
    setCurrentChat, 
    setCurrentChatMessages, 
    setThreads,
    fetchThreads
  } = useChatStore();

  useEffect(() => {
    // Initialize current chat and messages
    setCurrentChat(chat);
    setCurrentChatMessages(messages);
    
    // Only fetch threads if we have a valid chat with an ID
    if (chat?.id) {
      setThreads(threads);
      fetchThreads(chat.id).catch(error => {
        console.error('Failed to fetch threads during initialization:', error);
      });
    } else {
      // Reset threads if no chat is selected
      setThreads([]);
    }
  }, [
    chat, 
    messages, 
    threads, 
    setCurrentChat, 
    setCurrentChatMessages, 
    setThreads, 
    fetchThreads
  ]);

  return null;
} 