import type { ComponentProps } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { SidebarLeftIcon } from './icons';
import { Button } from './ui/button';
import { usePanel } from '@/lib/panel-context';

export function SidebarToggle({
  className,
}: ComponentProps<"button">) {
  const { panelStates, toggleCollapsed } = usePanel();
  
  // Derive collapsed state from panel context
  const isCollapsed = panelStates['chat-sidebar'] === 'collapsed';

  // Handle the toggle click using panel context
  const handleClick = () => {
    toggleCollapsed('chat-sidebar');
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleClick}
          variant="outline"
          className="md:px-2 md:h-fit"
        >
          <SidebarLeftIcon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start">
        {isCollapsed ? 'Expand' : 'Collapse'}
      </TooltipContent>
    </Tooltip>
  );
}
