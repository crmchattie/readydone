'use client';

import { usePanel, PanelType, PanelState } from '@/lib/panel-context';
import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PanelToggle } from './panel-toggle';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircleIcon, MessageSquareTextIcon, PlusIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useChatStore } from '@/lib/stores/chat-store';
import { useRouter, useParams } from 'next/navigation';
import { useNavigation } from '@/lib/navigation-context';
import { Thread } from '@/lib/db/schema';

// Define constants for panel widths
const PANEL_WIDTH_COLLAPSED = '3rem'; // Fixed width for collapsed panels (48px)
const PANEL_TRANSITION_DURATION = 0.3; // Animation duration

// Max widths for expanded panels (in px)
const SIDEBAR_MAX_WIDTH = '250px'; // Maximum width for expanded sidebars
const CONTENT_MIN_WIDTH = '400px'; // Minimum width for content panels

interface PanelProps {
  type: PanelType;
  className?: string;
  toggleDirection: 'left' | 'right';
  toggleLabel: string;
  children: ReactNode | ((props: { toggle: ReactNode }) => ReactNode);
  // Icon to show when collapsed
  collapsedIcon: React.ReactNode;
  // Whether this panel is a sidebar (true) or content panel (false)
  isSidebar?: boolean;
  // Optional user prop for showing avatar in collapsed state
  user?: any;
}

export function Panel({ 
  type, 
  className, 
  toggleDirection, 
  toggleLabel, 
  children,
  collapsedIcon,
  isSidebar = type.includes('sidebar'), // Default based on panel type
  user,
}: PanelProps) {
  const { chats, threads, fetchThreads, setCurrentChat, fetchChatMessages } = useChatStore();
  const router = useRouter();
  const params = useParams();
  const { setSelectedThreadId } = useNavigation();
  const { isPanelVisible, visiblePanels, getPanelState, showPanel, getPanelCategory } = usePanel();
  const isVisible = isPanelVisible(type);
  const panelState = getPanelState(type);
  const isCollapsed = panelState === 'collapsed';
  
  // Get the current chat ID from the URL params
  const chatId = typeof params?.id === 'string' ? params.id : null;

  // Fetch threads when needed
  useEffect(() => {
    if (type === 'threads-sidebar' && chatId) {
      fetchThreads(chatId);
    }
  }, [type, chatId, fetchThreads]);

  // Create the toggle component
  const toggleComponent = (
    <PanelToggle 
      panel={type} 
      direction={toggleDirection} 
      label={toggleLabel} 
    />
  );

  // Ensure panel is visible - all panels should always be in the DOM
  useEffect(() => {
    if (!isVisible) {
      showPanel(type);
    }
  }, [type, isVisible, showPanel]);

  // Count expanded and collapsed panels
  const countPanels = () => {
    const expandedSidebars = visiblePanels.filter(
      p => getPanelCategory(p) === 'sidebar' && getPanelState(p) === 'expanded'
    ).length;
    
    const expandedContentPanels = visiblePanels.filter(
      p => getPanelCategory(p) === 'content' && getPanelState(p) === 'expanded'
    ).length;

    const collapsedCount = visiblePanels.filter(
      p => getPanelState(p) === 'collapsed'
    ).length;
    
    return { expandedSidebars, expandedContentPanels, collapsedCount };
  };

  // Calculate width based on panel configuration
  const getWidth = () => {
    // Collapsed panels always have the same fixed width
    if (isCollapsed) return PANEL_WIDTH_COLLAPSED;

    const { expandedSidebars, expandedContentPanels, collapsedCount } = countPanels();
    
    if (isSidebar) {
      // For sidebar panels, use a fixed width
      return SIDEBAR_MAX_WIDTH;
    } else {
      // For content panels, calculate based on available space
      const totalCollapsedWidth = `${collapsedCount * 3}rem`;
      const totalSidebarWidth = `${expandedSidebars * parseInt(SIDEBAR_MAX_WIDTH, 10)}px`;
      
      if (expandedContentPanels === 1) {
        // Only this content panel is expanded
        return `calc(100vw - ${totalCollapsedWidth} - ${totalSidebarWidth})`;
      } else {
        // Multiple content panels, divide evenly
        return `calc((100vw - ${totalCollapsedWidth} - ${totalSidebarWidth}) / ${expandedContentPanels})`;
      }
    }
  };

  const handleNewChat = () => {
    setCurrentChat(null);
    showPanel('chat');
    router.push('/');
  };

  const handleChatSelect = async (chatId: string) => {
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      setCurrentChat(selectedChat);
      await fetchChatMessages(chatId);
      showPanel('chat');
      router.push(`/chat/${chatId}`);
    }
  };

  // If panel is not visible, don't render
  if (!isVisible) return null;

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={`panel-${type}`}
        data-panel={type}
        initial={{ 
          opacity: 0.8, 
          width: isCollapsed ? PANEL_WIDTH_COLLAPSED : getWidth() 
        }}
        animate={{ 
          opacity: 1,
          width: isCollapsed ? PANEL_WIDTH_COLLAPSED : getWidth()
        }}
        exit={{ opacity: 0 }}
        transition={{ 
          duration: PANEL_TRANSITION_DURATION,
          ease: "easeInOut"
        }}
        className={cn(
          "h-full relative border-r",
          isCollapsed ? "flex flex-col items-center py-4" : "",
          isSidebar ? "bg-muted/30" : "",
          className
        )}
        style={{ 
          boxSizing: 'border-box',
          width: isCollapsed ? PANEL_WIDTH_COLLAPSED : getWidth(),
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        {isCollapsed ? (
          // Collapsed view - show icon and user avatar if applicable
          <div className="flex flex-col items-center h-full">
            <div className="flex flex-col items-center space-y-4 pt-3">
              {/* Main Panel Icon and Label */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center size-8 rounded-md text-primary">
                  {collapsedIcon}
                </div>
                <div className="text-[10px] text-center font-medium text-muted-foreground mt-1">
                  {toggleLabel}
                </div>
              </div>

              {/* New Chat button for chat sidebar */}
              {type === 'chat-sidebar' && (
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
              )}

              {/* Show toggle in collapsed state */}
              {toggleComponent}

              {/* Chat Icons - Only for chat sidebar */}
              {type === 'chat-sidebar' && (
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                  {chats.slice(0, 5).map((chat) => (
                    <Tooltip key={chat.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-md text-primary hover:bg-primary/10"
                          onClick={() => handleChatSelect(chat.id)}
                        >
                          <MessageCircleIcon className="size-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {chat.title || 'Untitled Chat'}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}

              {/* Thread Icons - Only for threads sidebar */}
              {type === 'threads-sidebar' && chatId && (
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                  {threads?.slice(0, 5).map((thread: Thread) => (
                    <Tooltip key={thread.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-md text-primary hover:bg-primary/10"
                          onClick={() => {
                            setSelectedThreadId(thread.id);
                            showPanel('thread-chat');
                          }}
                        >
                          <MessageSquareTextIcon className="size-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {thread.name || 'Untitled Thread'}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>

            {/* User avatar for chat sidebar - at the bottom */}
            {type === 'chat-sidebar' && user && (
              <div className="mt-auto mb-4">
                <Link href="/settings">
                  <div className="size-8 rounded-full overflow-hidden cursor-pointer">
                    <Image
                      src={`https://avatar.vercel.sh/${user.email}`}
                      alt={user.email ?? 'User Avatar'}
                      className="size-full object-cover"
                      width={32}
                      height={32}
                    />
                  </div>
                </Link>
              </div>
            )}
          </div>
        ) : (
          // Expanded view - show full content
          <div className="size-full overflow-hidden">
            {typeof children === 'function' 
              ? children({ toggle: toggleComponent })
              : children
            }
            {/* Show toggle in expanded state */}
            {toggleComponent}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
} 