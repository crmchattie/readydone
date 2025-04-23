'use client';

import { PanelProvider, PanelType } from '@/lib/panel-context';
import { Panel } from './panel';
import { AppSidebar } from './app-sidebar';
import { Chat } from './chat';
import { ThreadsSidebar } from './threads-sidebar';
import { ThreadChatWrapper } from './thread-chat-wrapper';
import { NavigationProvider, useNavigation } from '@/lib/navigation-context';
import { SidebarProvider } from './ui/sidebar';
import { useCallback } from 'react';
import { 
  MessageCircleIcon, 
  MessageSquareTextIcon, 
  LayoutListIcon, 
  MessagesSquareIcon
} from 'lucide-react';

// Configuration for each panel
const PANEL_CONFIG: Record<string, {
  type: PanelType;
  toggleDirection: 'left' | 'right';
  toggleLabel: string;
  icon: React.ReactNode;
  isSidebar: boolean;
}> = {
  chatSidebar: {
    type: 'chat-sidebar' as PanelType,
    toggleDirection: 'right',
    toggleLabel: 'Chats',
    icon: <MessageCircleIcon className="size-5" />,
    isSidebar: true
  },
  chat: {
    type: 'chat' as PanelType,
    toggleDirection: 'right',
    toggleLabel: 'Chat',
    icon: <MessageSquareTextIcon className="size-5" />,
    isSidebar: false
  },
  threadsSidebar: {
    type: 'threads-sidebar' as PanelType,
    toggleDirection: 'right',
    toggleLabel: 'Threads',
    icon: <LayoutListIcon className="size-5" />,
    isSidebar: true
  },
  threadChat: {
    type: 'thread-chat' as PanelType,
    toggleDirection: 'left',
    toggleLabel: 'Thread',
    icon: <MessagesSquareIcon className="size-5" />,
    isSidebar: false
  }
};

interface FourPanelLayoutProps {
  chatId: string;
  initialMessages: any[];
  selectedChatModel: string;
  selectedVisibilityType: string;
  isReadonly: boolean;
  user: any;
}

// Inner component that has access to the navigation context
function FourPanelLayoutInner({
  chatId,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
  user,
}: FourPanelLayoutProps) {
  const { selectedThreadId, setSelectedThreadId } = useNavigation();
  
  // Thread selection handler
  const handleThreadClick = useCallback((threadId: string) => {
    console.log(`Thread clicked: ${threadId}`);
    
    setSelectedThreadId(threadId);
    
    // Trigger event to focus the thread panels
    const event = new CustomEvent('show-thread-panels', { 
      detail: { threadId } 
    });
    window.dispatchEvent(event);
  }, [setSelectedThreadId]);

  return (
    <PanelProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Panel 1: Chat Sidebar - Always expanded by default */}
        <Panel 
          type={PANEL_CONFIG.chatSidebar.type}
          toggleDirection={PANEL_CONFIG.chatSidebar.toggleDirection}
          toggleLabel={PANEL_CONFIG.chatSidebar.toggleLabel}
          collapsedIcon={PANEL_CONFIG.chatSidebar.icon}
          isSidebar={PANEL_CONFIG.chatSidebar.isSidebar}
          user={user}
        >
          <div className="size-full">
            <AppSidebar user={user} />
          </div>
        </Panel>

        {/* Panel 2: Main Chat - Always expanded by default */}
        <Panel
          type={PANEL_CONFIG.chat.type}
          toggleDirection={PANEL_CONFIG.chat.toggleDirection}
          toggleLabel={PANEL_CONFIG.chat.toggleLabel}
          collapsedIcon={PANEL_CONFIG.chat.icon}
          isSidebar={PANEL_CONFIG.chat.isSidebar}
        >
          {({ toggle }) => (
            <Chat
              id={chatId}
              initialMessages={initialMessages}
              selectedChatModel={selectedChatModel}
              selectedVisibilityType={selectedVisibilityType as any}
              isReadonly={isReadonly}
              toggle={toggle}
            />
          )}
        </Panel>

        {/* Panel 3: Threads Sidebar - Collapsed by default */}
        <Panel
          type={PANEL_CONFIG.threadsSidebar.type}
          toggleDirection={PANEL_CONFIG.threadsSidebar.toggleDirection}
          toggleLabel={PANEL_CONFIG.threadsSidebar.toggleLabel}
          collapsedIcon={PANEL_CONFIG.threadsSidebar.icon}
          isSidebar={PANEL_CONFIG.threadsSidebar.isSidebar}
        >
          {({ toggle }) => (
            <div className="size-full">
              <ThreadsSidebar 
                chatId={chatId} 
                onThreadClick={handleThreadClick}
                toggle={toggle}
              />
            </div>
          )}
        </Panel>

        {/* Panel 4: Thread Chat - Collapsed by default */}
        <Panel
          type={PANEL_CONFIG.threadChat.type}
          toggleDirection={PANEL_CONFIG.threadChat.toggleDirection}
          toggleLabel={PANEL_CONFIG.threadChat.toggleLabel}
          collapsedIcon={PANEL_CONFIG.threadChat.icon}
          isSidebar={PANEL_CONFIG.threadChat.isSidebar}
        >
          {({ toggle }) => (
            <ThreadChatWrapper toggle={toggle} />
          )}
        </Panel>
      </div>
    </PanelProvider>
  );
}

// Outer component that provides the navigation context
export function FourPanelLayout(props: FourPanelLayoutProps) {
  return (
    <NavigationProvider>
      <SidebarProvider>
        <FourPanelLayoutInner {...props} />
      </SidebarProvider>
    </NavigationProvider>
  );
} 