'use client';

import { User } from 'next-auth';
import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import { useEffect, ReactNode } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useNavigation } from '@/lib/navigation-context';
import { Thread } from '@/lib/db/schema';
import { BaseSidebar } from './base-sidebar';
import { SidebarGroup, SidebarGroupContent, SidebarMenu } from './ui/sidebar';
import { ThreadItem } from './thread-item';

interface ThreadsSidebarProps {
  user?: User;
  chatId: string;
  onThreadClick: (threadId: string) => void;
  toggle: ReactNode;
}

export function ThreadsSidebar({ user, chatId, onThreadClick, toggle }: ThreadsSidebarProps) {
  const { threads, isLoadingThreads } = useChatStore();
  const { selectedThreadId } = useNavigation();

  const headerContent = (
    <Link href="/" className="flex flex-row gap-3 items-center">
      <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer transition-all duration-200">
        Threads
      </span>
    </Link>
  );

  const mainContent = (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {(threads || []).map((thread) => {
            if (!thread?.id || !thread?.name) {
              console.warn('Invalid thread data:', thread);
              return null;
            }
            
            // Map thread status to UI status
            const uiStatus = (() => {
              switch (thread.status) {
                case 'awaiting_reply': return 'pending';
                case 'replied': return 'replied';
                default: return 'contacted';
              }
            })();

            return (
              <ThreadItem
                key={thread.id}
                thread={{
                  id: thread.id,
                  name: thread.name,
                  status: uiStatus,
                  lastMessage: thread.lastMessagePreview || 'No messages yet'
                }}
                isCollapsed={false}
                onClick={() => onThreadClick(thread.id)}
              />
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <BaseSidebar
      user={user}
      panelType="threads-sidebar"
      isLoading={isLoadingThreads}
      isEmpty={!threads || threads.length === 0}
      emptyMessage="No threads available for this chat."
      headerContent={headerContent}
      mainContent={mainContent}
    />
  );
} 