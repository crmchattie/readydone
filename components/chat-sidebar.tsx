import { User } from 'next-auth';
import { MessageCircleIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarHistory } from './sidebar-history';
import { SidebarUserNav } from './sidebar-user-nav';
import { useChatStore } from '@/lib/stores/chat-store';
import { usePanel } from '@/lib/panel-context';
import { BaseSidebar } from './base-sidebar';

export function ChatSidebar({ user }: { user: User | undefined }) {
  const { 
    chats,
    isLoadingChats,
    setCurrentChat,
    fetchChatMessages,
    fetchThreads
  } = useChatStore();
  
  const { panelStates, showPanel } = usePanel();
  const isCollapsed = panelStates['chat-sidebar'] === 'collapsed';

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
        fetchChatMessages(selectedChat.id),
        fetchThreads(selectedChat.id)
      ]);
      showPanel('chat');
    }
  };

  const headerContent = (
    <>
      {isCollapsed ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-md text-primary"
                onClick={handleNewChat}
              >
                <PlusIcon className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New Chat</TooltipContent>
          </Tooltip>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center size-8 rounded-md text-primary">
              <MessageCircleIcon className="size-5" />
            </div>
            <div className="text-[10px] text-center font-medium text-muted-foreground mt-1">
              Chats
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-row justify-between items-center w-full">
          <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer transition-all duration-200">
            Chats
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                type="button"
                className="p-2 h-fit"
                onClick={handleNewChat}
              >
                <PlusIcon className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="end">New Chat</TooltipContent>
          </Tooltip>
        </div>
      )}
    </>
  );

  const mainContent = (
    <SidebarHistory 
      chats={chats}
      isLoading={isLoadingChats}
      onSelectChat={handleSelectChat}
      isCollapsed={isCollapsed}
    />
  );

  const footerContent = user && !isCollapsed ? <SidebarUserNav user={user} /> : null;

  return (
    <BaseSidebar
      user={user}
      panelType="chat-sidebar"
      isLoading={isLoadingChats}
      isEmpty={!chats?.length}
      emptyMessage="Your conversations will appear here once you start chatting!"
      headerContent={headerContent}
      mainContent={mainContent}
      footerContent={footerContent}
    />
  );
} 