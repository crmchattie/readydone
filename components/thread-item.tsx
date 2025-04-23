'use client';

import { useNavigation, ThreadType } from '@/lib/navigation-context';
import { Clock, MoreHorizontal, CheckCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePanel } from '@/lib/panel-context';

export interface ThreadItemProps {
  thread: ThreadType;
  isCollapsed?: boolean;
  onClick?: () => void;
}

export function ThreadItem({ thread, isCollapsed = false, onClick }: ThreadItemProps) {
  const { selectedThreadId, setSelectedThreadId } = useNavigation();
  const { showPanel } = usePanel();
  const isSelected = thread.id === selectedThreadId;
  
  // Format the last message timestamp
  const lastMessageDate = new Date();
  const timeAgo = formatDistanceToNow(lastMessageDate, { addSuffix: true });
  
  // Define status icons
  const statusIcons = {
    pending: <Clock className="size-4 text-yellow-500" />,
    replied: <CheckCircle className="size-4 text-green-500" />,
    contacted: <MessageCircle className="size-4 text-blue-500" />,
    default: <MessageCircle className="size-4 text-muted-foreground" />
  };
  
  // Handle thread selection
  const handleClick = () => {
    setSelectedThreadId(thread.id);
    showPanel('thread-chat');
    
    if (onClick) {
      onClick();
    }
  };

  // Get the appropriate status icon, fallback to default if status doesn't match
  const statusIcon = statusIcons[thread.status as keyof typeof statusIcons] || statusIcons.default;

  return (
    <div
      className={cn(
        "flex flex-col p-3 cursor-pointer border-b hover:bg-muted/50 transition-colors gap-2",
        isSelected && "bg-muted"
      )}
      onClick={handleClick}
    >
      {!isCollapsed && (
        <>
          {/* Top level: Thread name and status */}
          <div className="flex items-center justify-between">
            <span className="font-medium">{thread.name}</span>
            <div className="flex items-center gap-2">
              <span>{statusIcon}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuItem>Archive</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Middle level: Last message */}
          <div className="text-sm text-muted-foreground line-clamp-2">
            {thread.lastMessage}
          </div>
          
          {/* Bottom level: Time ago */}
          <div className="text-xs text-muted-foreground capitalize">
            {timeAgo}
          </div>
        </>
      )}
      
      {isCollapsed && (
        <div className="flex justify-center w-full">
          {statusIcon}
        </div>
      )}
    </div>
  );
} 