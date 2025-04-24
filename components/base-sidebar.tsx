import { User } from 'next-auth';
import { useParams } from 'next/navigation';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { usePanel } from '@/lib/panel-context';
import { PanelToggle } from './panel-toggle';

interface BaseSidebarProps {
  user: User | undefined;
  panelType: 'chat-sidebar' | 'threads-sidebar';
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  mainContent?: ReactNode;
}

export function BaseSidebar({
  user,
  panelType,
  isLoading,
  isEmpty,
  emptyMessage,
  headerContent,
  footerContent,
  mainContent,
}: BaseSidebarProps) {
  const { panelStates } = usePanel();
  const isCollapsed = panelStates[panelType] === 'collapsed';
  const { id } = useParams();

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
            {/* Header content in collapsed state */}
            <div className="flex flex-col items-center space-y-4">
              {headerContent}
            </div>
            
            {/* Main content in collapsed state */}
            <div className="flex-1 overflow-y-auto my-4 scrollbar-hide">
              {mainContent}
            </div>
            
            {/* Footer content in collapsed state */}
            <div className="mt-auto mb-2">
              {footerContent}
            </div>
          </div>
        ) : (
          // Expanded view
          <>
            <SidebarHeader>
              <SidebarMenu>
                <div className="flex flex-row justify-between items-center">
                  {headerContent}
                  <PanelToggle 
                    panel={panelType}
                    direction="left"
                    label={panelType === 'chat-sidebar' ? 'Chat Sidebar' : 'Threads Sidebar'}
                  />
                </div>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="sidebar-history-wrapper">
              {isLoading ? (
                <SidebarGroup>
                  <div className="flex flex-col">
                    {[44, 32, 28, 64, 52].map((item) => (
                      <div
                        key={item}
                        className="rounded-md h-8 flex gap-2 px-2 items-center"
                      >
                        <div
                          className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                          style={
                            {
                              '--skeleton-width': `${item}%`,
                            } as React.CSSProperties
                          }
                        />
                      </div>
                    ))}
                  </div>
                </SidebarGroup>
              ) : isEmpty ? (
                <SidebarGroup>
                  <SidebarGroupContent>
                    <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
                      {emptyMessage}
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              ) : (
                mainContent
              )}
            </SidebarContent>
            {footerContent && (
              <SidebarFooter>
                {footerContent}
              </SidebarFooter>
            )}
          </>
        )}
      </Sidebar>
    </div>
  );
} 