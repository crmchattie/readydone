'use client';

import { LoaderIcon } from 'lucide-react';
import { Chat } from '@/components/chat';
import { useNavigation } from '../lib/navigation-context';
import { generateUUID } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { UIMessage } from 'ai';

export function ThreadMessageSidebar() {
  const { threads, selectedThreadId } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  
  const selectedThread = threads.find(t => t.id === selectedThreadId);
  
  // Fetch thread messages when selectedThreadId changes
  useEffect(() => {
    if (!selectedThreadId) return;
    
    async function fetchThreadMessages() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/thread-messages?threadId=${selectedThreadId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch thread messages');
        }
        const data = await response.json();
        
        // Convert the thread messages to the UIMessage format expected by the Chat component
        const uiMessages: UIMessage[] = data.map((message: any) => ({
          id: message.id,
          role: message.role,
          content: Array.isArray(message.content) ? '' : message.content.toString(),
          parts: Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content.toString() }],
          createdAt: new Date(message.createdAt),
        }));
        
        setMessages(uiMessages);
      } catch (error) {
        console.error('Error fetching thread messages:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchThreadMessages();
  }, [selectedThreadId]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b p-4 flex items-center gap-2">
        <h2 className="text-lg font-semibold">
          {selectedThread ? selectedThread.name : 'Thread Messages'}
        </h2>
        {isLoading && <LoaderIcon className="animate-spin size-4 ml-2" />}
      </div>
      <div className="flex-1 overflow-auto">
        {!selectedThread ? (
          <div className="flex flex-col h-full justify-center items-center text-muted-foreground">
            <p className="text-center px-4">
              Select a thread to view its messages
            </p>
          </div>
        ) : !isLoading && (
          <div className="h-full">
            <Chat
              id={selectedThreadId || generateUUID()}
              initialMessages={messages}
              selectedChatModel="default-model"
              selectedVisibilityType="private"
              isReadonly={false}
            />
          </div>
        )}
      </div>
    </div>
  );
} 