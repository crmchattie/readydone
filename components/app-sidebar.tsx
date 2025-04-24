'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

import { MessageCircleIcon, PlusIcon } from 'lucide-react';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useNavigation } from '@/lib/navigation-context';
import { usePanel } from '@/lib/panel-context';
import { PanelToggle } from './panel-toggle';
import { useChatStore } from '@/lib/stores/chat-store';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { level, openLevels } = useNavigation();
  const { showPanel, panelStates } = usePanel();
  
  // Get chat data from store
  const { 
    chats,
    isLoadingChats,
    fetchChats,
    setCurrentChat,
    fetchChatMessages,
    fetchThreads
  } = useChatStore();
  
  // Derive isCollapsed directly from panelStates every render - single source of truth
  const isCollapsed = panelStates['chat-sidebar'] === 'collapsed';
  const chatSidebarState = panelStates['chat-sidebar'];
  
  // Fetch chats when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchChats(user.id);
    }
  }, [user?.id, fetchChats]);

  // Debug changes in panel state
  useEffect(() => {
    console.log(`AppSidebar - chat-sidebar state: ${chatSidebarState}, isCollapsed: ${isCollapsed}`);
  }, [chatSidebarState, isCollapsed]);

  // Listen for chat selection events
  useEffect(() => {
    const handleChatSelection = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const chatId = customEvent.detail?.chatId;
      
      if (chatId) {
        const selectedChat = chats.find(chat => chat.id === chatId);
        if (selectedChat) {
          setCurrentChat(selectedChat);
          await fetchChatMessages(chatId);
          showPanel('chat');
        }
      }
    };

    window.addEventListener('select-chat', handleChatSelection);
    return () => {
      window.removeEventListener('select-chat', handleChatSelection);
    };
  }, [chats, setCurrentChat, fetchChatMessages, showPanel]);

  const handleNewChat = () => {
    setCurrentChat(null);
    if (panelStates['chat'] === 'collapsed') {
      showPanel('chat');
    }
  };

  const handleSelectChat = async (chatId: string) => {
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      setCurrentChat(selectedChat);
      await Promise.all([
        fetchChatMessages(chatId),
        fetchThreads(chatId)
      ]);
      showPanel('chat');
    }
  };

  return (
    <div className="relative h-full">
      <Sidebar 
        className="h-full group-data-[side=left]:border-r"
        data-state={isCollapsed ? 'collapsed' : 'expanded'}
        collapsible="offcanvas"
      >
        {isCollapsed ? (
          // Collapsed view
          <div className="flex flex-col h-full justify-between py-4">
            {/* Collapsed header with new chat button */}
            <div className="flex flex-col items-center space-y-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-md text-primary"
                    onClick={handleNewChat}
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">New Chat</TooltipContent>
              </Tooltip>
              
              {/* Icon for chat bubbles */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center size-8 rounded-md text-primary">
                  <MessageCircleIcon className="size-5" />
                </div>
                <div className="text-[10px] text-center font-medium text-muted-foreground mt-1">
                  Chats
                </div>
              </div>
            </div>
            
            {/* Chat history in collapsed view */}
            <div className="flex-1 overflow-hidden my-4">
              <SidebarHistory 
                chats={chats}
                isLoading={isLoadingChats}
                onSelectChat={handleSelectChat}
              />
            </div>
            
            {/* User settings in collapsed view */}
            <div className="flex flex-col items-center mt-auto">
              {user && (
                <div className="size-8 rounded-full overflow-hidden cursor-pointer">
                  <Link href="/settings">
                    <Image
                      src={`https://avatar.vercel.sh/${user.email}`}
                      alt={user.email ?? 'User Avatar'}
                      className="size-full object-cover"
                      width={32}
                      height={32}
                    />
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Expanded view (original content)
          <>
            <SidebarHeader>
              <SidebarMenu>
                <div className="flex flex-row justify-between items-center">
                  <Link
                    href="/"
                    className="flex flex-row gap-3 items-center"
                  >
                    <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer transition-all duration-200">
                      Chats
                    </span>
                  </Link>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          type="button"
                          className="p-2 h-fit"
                          onClick={handleNewChat}
                        >
                          <PlusIcon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent align="end">New Chat</TooltipContent>
                    </Tooltip>
                    <PanelToggle 
                      panel="chat-sidebar"
                      direction="left"
                      label="Chat Sidebar"
                    />
                  </div>
                </div>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="sidebar-history-wrapper">
              <SidebarHistory 
                chats={chats}
                isLoading={isLoadingChats}
                onSelectChat={handleSelectChat}
              />
            </SidebarContent>
            <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
          </>
        )}
      </Sidebar>
    </div>
  );
}
