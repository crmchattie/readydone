'use client';

import { format, isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from '@/components/ui/sidebar';
import type { Chat } from '@/lib/db/schema';
import { ChatItem } from '@/components/sidebar-history-item';
import { Loader2 } from 'lucide-react';
import { usePanel } from '@/lib/panel-context';

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

export interface ChatHistory {
  chats: Array<Chat>;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory,
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) return null;

  return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

// Custom hook to subscribe to sidebar panel state
function useSidebarState() {
  const { panelStates } = usePanel();
  const [isCollapsed, setIsCollapsed] = useState(panelStates['chat-sidebar'] === 'collapsed');

  useEffect(() => {
    // Update local state when panel state changes
    setIsCollapsed(panelStates['chat-sidebar'] === 'collapsed');
    console.log('SidebarHistory - Panel state hook updated:', panelStates['chat-sidebar'], isCollapsed ? 'collapsed' : 'expanded');
  }, [panelStates, isCollapsed]);

  return isCollapsed;
}

interface ChatHistoryResponse {
  chats: Chat[];
  hasMore: boolean;
}

interface SidebarHistoryProps {
  isCollapsed?: boolean;
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
  chats: Chat[];
  isLoading: boolean;
}

export function SidebarHistory({
  isCollapsed = false,
  selectedChatId,
  onSelectChat,
  chats,
  isLoading
}: SidebarHistoryProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const groupedChats = useMemo(() => {
    const groups: Record<string, Chat[]> = {};
    
    chats.forEach((chat) => {
      if (!chat?.id) return;
      
      const date = format(new Date(chat.createdAt), "MMMM d, yyyy");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(chat);
    });
    
    return groups;
  }, [chats]);

  const deleteChat = async (chatId: string) => {
    setIsDeleting(chatId);
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      onSelectChat('');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <div className="space-y-4">
          <AnimatePresence>
            {Object.entries(groupedChats).map(([date, dateChats]) => (
              <div key={date}>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {date}
                </div>
                <SidebarMenu className="list-none">
                  {dateChats.map((chat) => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChatItem
                        chat={chat}
                        isActive={selectedChatId === chat.id}
                        isCollapsed={isCollapsed}
                        onDelete={() => deleteChat(chat.id)}
                        onSelectChat={onSelectChat}
                      />
                    </motion.div>
                  ))}
                </SidebarMenu>
              </div>
            ))}
          </AnimatePresence>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
