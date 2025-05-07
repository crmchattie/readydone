import { Chat } from '@/lib/db/schema';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  ShareIcon,
  TrashIcon,
} from './icons';
import { MessageCircle } from 'lucide-react';
import { memo, useEffect } from 'react';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { Button } from './ui/button';
import { useChatStore } from '@/lib/stores/chat-store';

interface ChatItemProps {
  chat: Chat;
  isActive?: boolean;
  isCollapsed?: boolean;
  onDelete?: (chatId: string) => void;
  onSelectChat?: (chatId: string) => void | Promise<void>;
}

const PureChatItem = ({
  chat,
  isActive,
  isCollapsed = false,
  onDelete,
  onSelectChat,
}: ChatItemProps) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibility: chat.visibility,
  });
  
  const { currentChat } = useChatStore();
  const isActiveChat = isActive || currentChat?.id === chat.id;
  
  
  return (
    <SidebarMenuItem className="relative flex items-center">
      <SidebarMenuButton 
        asChild 
        isActive={isActiveChat}
        tooltip={isCollapsed ? chat.title : undefined}
        className="w-full"
      >
        <Button 
          variant="ghost"
          className="w-full"
          onClick={() => {
            onSelectChat?.(chat.id);
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {isCollapsed ? (
              <MessageCircle className="size-4" />
            ) : (
              <span className="pr-8 pl-2 truncate w-full text-left">{chat.title}</span>
            )}
          </div>
        </Button>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="absolute right-1.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            showOnHover={!isActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end">
          {/* <DropdownMenuSub> */}
            {/* <DropdownMenuSubTrigger className="cursor-pointer">
              <ShareIcon />
              <span>Share</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => {
                    setVisibilityType('private');
                  }}
                >
                  <div className="flex flex-row gap-2 items-center">
                    <LockIcon size={12} />
                    <span>Private</span>
                  </div>
                  {visibilityType === 'private' ? (
                    <CheckCircleFillIcon />
                  ) : null}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => {
                    setVisibilityType('public');
                  }}
                >
                  <div className="flex flex-row gap-2 items-center">
                    <GlobeIcon />
                    <span>Public</span>
                  </div>
                  {visibilityType === 'public' ? <CheckCircleFillIcon /> : null}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub> */}

          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => onDelete?.(chat.id)}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  // Never memoize - always re-render when anything changes
  // This ensures we always respond to panel state changes
  return false;
});
