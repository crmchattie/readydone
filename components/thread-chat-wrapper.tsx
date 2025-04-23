'use client';

import { LoaderIcon } from 'lucide-react';
import { Chat } from '@/components/chat';
import { useNavigation } from '@/lib/navigation-context';
import { generateUUID } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { UIMessage } from 'ai';
import { usePanel } from '@/lib/panel-context';
import { ReactNode } from 'react';

interface ThreadChatWrapperProps {
  threadId?: string;
  toggle?: ReactNode;
}

export function ThreadChatWrapper({ threadId: propThreadId, toggle }: ThreadChatWrapperProps = {}) {
  const { threads, selectedThreadId } = useNavigation();
  const { showPanel } = usePanel();
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  
  // Use the prop threadId if provided, otherwise use the selectedThreadId from context
  const threadId = propThreadId || selectedThreadId;
  const selectedThread = threads.find(t => t.id === threadId);
  
  // Fetch thread messages when threadId changes
  useEffect(() => {
    if (!threadId) return;
    
    async function fetchThreadMessages() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/thread-messages?threadId=${threadId}`);
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
  }, [threadId]);

  return (
    <div className="flex flex-col min-w-0 h-full bg-background">      
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Chat
            id={threadId || generateUUID()}
            initialMessages={messages}
            selectedChatModel="default-model"
            selectedVisibilityType="private"
            isReadonly={false}
            toggle={toggle}
            isThreadChat={true}
            selectedThread={selectedThread}
          />
        )}
    </div>
  );
} 