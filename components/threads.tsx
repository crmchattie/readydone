'use client';

import { useNavigation } from '../lib/navigation-context';
import { ThreadItem } from './thread-item';
import { LoaderIcon } from 'lucide-react';
import { useSidebar } from './ui/sidebar';

type ThreadsListProps = {
  isLoading?: boolean;
};

export function ThreadsList({ isLoading = false }: ThreadsListProps) {
  const { threads } = useNavigation();
  const { state: mainSidebarState } = useSidebar();
  const isCollapsed = mainSidebarState === 'collapsed';

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="border-b p-4 flex items-center gap-2">
        {!isCollapsed && <h2 className="text-lg font-semibold">Threads</h2>}
      </div>
      
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 flex justify-center items-center">
            <LoaderIcon className="animate-spin mr-2" />
            <span>Loading threads...</span>
          </div>
        ) : threads.length > 0 ? (
          threads.map((thread) => (
            <ThreadItem 
              key={thread.id} 
              thread={thread} 
              isCollapsed={isCollapsed}
            />
          ))
        ) : (
          <div className={`p-4 text-center text-muted-foreground ${isCollapsed ? 'hidden' : ''}`}>
            No threads available.
          </div>
        )}
      </div>
    </div>
  );
} 