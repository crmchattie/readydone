'use client';

import { useNavigation, ThreadType } from '@/lib/navigation-context';
import { ThreadItem } from './thread-item';
import { LoaderIcon } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { usePanel } from '@/lib/panel-context';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu 
} from '@/components/ui/sidebar';
import { useChatStore } from '@/lib/stores/chat-store';
import { Thread } from '@/lib/db/schema';

interface ThreadsSidebarProps {
  chatId: string;
  onThreadClick?: (threadId: string) => void;
  toggle?: ReactNode;
}

// Helper function to convert DB Thread to NavigationContext ThreadType
function convertToThreadType(thread: Thread): ThreadType {
  return {
    id: thread.id,
    name: thread.name,
    status: thread.status === 'awaiting_reply' ? 'pending' 
           : thread.status === 'replied' ? 'replied' 
           : 'contacted',
    lastMessage: thread.lastMessagePreview || 'No messages yet'
  };
}

export function ThreadsSidebar({ chatId, onThreadClick, toggle }: ThreadsSidebarProps) {
  const { setThreads: setNavigationThreads, setSelectedThreadId } = useNavigation();
  const { showPanel } = usePanel();
  const { threads: storeThreads, isLoadingThreads, fetchThreads } = useChatStore();

  // Fetch threads when component mounts or chatId changes
  useEffect(() => {
    if (chatId) {
      fetchThreads(chatId);
    }
  }, [chatId, fetchThreads]);

  // Update navigation context whenever store threads change
  useEffect(() => {
    const navigationThreads = storeThreads.map(convertToThreadType);
    setNavigationThreads(navigationThreads);
  }, [storeThreads, setNavigationThreads]);

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
    showPanel('thread-chat');
    
    if (onThreadClick) {
      onThreadClick(threadId);
    }
  };

  // Convert store threads to navigation thread type for rendering
  const displayThreads = storeThreads.map(convertToThreadType);

  return (
    <div className="size-full">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer transition-all duration-200">
              Threads
            </span>
            <div className="flex items-center gap-1">
              {toggle}
            </div>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="sidebar-threads-wrapper">
        {isLoadingThreads ? (
          <div className="p-4 flex justify-center items-center">
            <LoaderIcon className="animate-spin mr-2" />
            <span>Loading threads...</span>
          </div>
        ) : displayThreads.length > 0 ? (
          <div className="flex flex-col">
            {displayThreads.map((thread) => (
              <ThreadItem 
                key={thread.id} 
                thread={thread}
                onClick={() => handleThreadSelect(thread.id)}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            No threads available.
          </div>
        )}
      </SidebarContent>
    </div>
  );
} 