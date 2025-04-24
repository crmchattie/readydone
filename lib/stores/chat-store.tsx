'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { UIMessage } from 'ai';
import { Chat, Thread } from '../db/schema';

interface ChatState {
  // Chats
  chats: Chat[];
  currentChat: Chat | null;
  currentChatMessages: UIMessage[];
  
  // Threads
  threads: Thread[];
  currentThread: Thread | null;
  currentThreadMessages: UIMessage[];
  
  // Loading States
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isLoadingThreads: boolean;
  isLoadingThreadMessages: boolean;
}

type ChatAction =
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }
  | { type: 'SET_CURRENT_CHAT_MESSAGES'; payload: UIMessage[] }
  | { type: 'SET_THREADS'; payload: Thread[] }
  | { type: 'SET_CURRENT_THREAD'; payload: Thread | null }
  | { type: 'SET_CURRENT_THREAD_MESSAGES'; payload: UIMessage[] }
  | { type: 'SET_LOADING'; key: keyof Pick<ChatState, 'isLoadingChats' | 'isLoadingMessages' | 'isLoadingThreads' | 'isLoadingThreadMessages'>; value: boolean };

const initialState: ChatState = {
  chats: [],
  currentChat: null,
  currentChatMessages: [],
  threads: [],
  currentThread: null,
  currentThreadMessages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  isLoadingThreads: false,
  isLoadingThreadMessages: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload };
    case 'SET_CURRENT_CHAT_MESSAGES':
      return { ...state, currentChatMessages: action.payload };
    case 'SET_THREADS':
      return { ...state, threads: action.payload };
    case 'SET_CURRENT_THREAD':
      return { ...state, currentThread: action.payload };
    case 'SET_CURRENT_THREAD_MESSAGES':
      return { ...state, currentThreadMessages: action.payload };
    case 'SET_LOADING':
      return { ...state, [action.key]: action.value };
    default:
      return state;
  }
}

interface ChatContextValue extends ChatState {
  // Setters
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  setCurrentChatMessages: (messages: UIMessage[]) => void;
  setThreads: (threads: Thread[]) => void;
  setCurrentThread: (thread: Thread | null) => void;
  setCurrentThreadMessages: (messages: UIMessage[]) => void;
  
  // Actions
  fetchChats: (userId: string) => Promise<void>;
  fetchChatMessages: (chatId: string) => Promise<void>;
  fetchThreads: (chatId: string) => Promise<void>;
  fetchThreadMessages: (threadId: string) => Promise<void>;
  prefetchThreadMessages: (threads: Thread[]) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const setChats = useCallback((chats: Chat[]) => {
    console.log('ChatStore - Setting chats:', chats);
    dispatch({ type: 'SET_CHATS', payload: chats });
  }, []);

  const setCurrentChatMessages = useCallback((messages: UIMessage[]) => {
    dispatch({ type: 'SET_CURRENT_CHAT_MESSAGES', payload: messages });
  }, []);

  const setThreads = useCallback((threads: Thread[]) => {
    dispatch({ type: 'SET_THREADS', payload: threads });
  }, []);

  const setCurrentThread = useCallback((thread: Thread | null) => {
    dispatch({ type: 'SET_CURRENT_THREAD', payload: thread });
  }, []);

  const setCurrentThreadMessages = useCallback((messages: UIMessage[]) => {
    dispatch({ type: 'SET_CURRENT_THREAD_MESSAGES', payload: messages });
  }, []);

  const setLoading = useCallback((key: keyof Pick<ChatState, 'isLoadingChats' | 'isLoadingMessages' | 'isLoadingThreads' | 'isLoadingThreadMessages'>, value: boolean) => {
    dispatch({ type: 'SET_LOADING', key, value });
  }, []);

  const fetchChats = useCallback(async (userId: string) => {
    try {
      console.log('ChatStore - Fetching chats for user:', userId);
      setLoading('isLoadingChats', true);
      const response = await fetch(`/api/chat/list?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      const data = await response.json();
      // Extract just the chat objects from the response
      const transformedChats = data.chats.map((item: any) => ({
        id: item.chat.id,
        createdAt: new Date(item.chat.createdAt),
        title: item.chat.title,
        visibility: item.chat.visibility
      }));
      console.log('ChatStore - Transformed chats:', transformedChats);
      setChats(transformedChats);
      setLoading('isLoadingChats', false);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setLoading('isLoadingChats', false);
    }
  }, [setLoading, setChats]);

  const fetchChatMessages = useCallback(async (chatId: string) => {
    try {
      setLoading('isLoadingMessages', true);
      const response = await fetch(`/api/messages?chatId=${chatId}`);
      const messages = await response.json();
      setCurrentChatMessages(messages);
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
    } finally {
      setLoading('isLoadingMessages', false);
    }
  }, [setLoading, setCurrentChatMessages]);

  const fetchThreads = useCallback(async (chatId: string) => {
    try {
      setLoading('isLoadingThreads', true);
      const response = await fetch(`/api/threads?chatId=${chatId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch threads');
      }
      const threads = await response.json();
      // Ensure threads is an array
      setThreads(Array.isArray(threads) ? threads : []);
    } catch (error) {
      console.error('Failed to fetch threads:', error);
      setThreads([]); // Set empty array on error
    } finally {
      setLoading('isLoadingThreads', false);
    }
  }, [setLoading, setThreads]);

  const setCurrentChat = useCallback((chat: Chat | null) => {
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    
    // Clear messages when switching chats
    dispatch({ type: 'SET_CURRENT_CHAT_MESSAGES', payload: [] });
    
    // Clear threads and thread messages if no chat is selected
    if (!chat?.id) {
      dispatch({ type: 'SET_THREADS', payload: [] });
      dispatch({ type: 'SET_CURRENT_THREAD', payload: null });
      dispatch({ type: 'SET_CURRENT_THREAD_MESSAGES', payload: [] });
      return;
    }
    
    // Fetch threads for the selected chat
    fetchThreads(chat.id).catch(error => {
      console.error('Failed to fetch threads:', error);
      dispatch({ type: 'SET_THREADS', payload: [] });
    });
  }, [fetchThreads]);

  const fetchThreadMessages = useCallback(async (threadId: string) => {
    try {
      setLoading('isLoadingThreadMessages', true);
      const response = await fetch(`/api/thread-messages?threadId=${threadId}`);
      const messages = await response.json();
      setCurrentThreadMessages(messages);
    } catch (error) {
      console.error('Failed to fetch thread messages:', error);
    } finally {
      setLoading('isLoadingThreadMessages', false);
    }
  }, [setLoading, setCurrentThreadMessages]);

  // New method to fetch all thread messages for a chat
  const prefetchThreadMessages = useCallback(async (threads: Thread[]) => {
    try {
      setLoading('isLoadingThreadMessages', true);
      const messagePromises = threads.map(thread => 
        fetch(`/api/thread-messages?threadId=${thread.id}`)
          .then(res => res.json())
          .catch(error => {
            console.error(`Failed to fetch messages for thread ${thread.id}:`, error);
            return [];
          })
      );
      
      const allMessages = await Promise.all(messagePromises);
      
      // Store messages for each thread
      threads.forEach((thread, index) => {
        const messages = allMessages[index];
        // You could store these in a map or other data structure
        // For now we'll just use currentThreadMessages
        if (messages.length > 0) {
          setCurrentThreadMessages(messages);
        }
      });
    } catch (error) {
      console.error('Failed to prefetch thread messages:', error);
    } finally {
      setLoading('isLoadingThreadMessages', false);
    }
  }, [setLoading, setCurrentThreadMessages]);

  const value: ChatContextValue = {
    ...state,
    setChats,
    setCurrentChat,
    setCurrentChatMessages,
    setThreads,
    setCurrentThread,
    setCurrentThreadMessages,
    fetchChats,
    fetchChatMessages,
    fetchThreads,
    fetchThreadMessages,
    prefetchThreadMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatStore() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  return context;
} 