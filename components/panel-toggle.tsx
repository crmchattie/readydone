'use client';

import { PanelLeftIcon, PanelRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelType, usePanel } from '@/lib/panel-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PanelToggleProps {
  panel: PanelType;
  direction: 'left' | 'right';
  label: string;
  className?: string;
  onToggle?: (expanded: boolean) => void;
}

export function PanelToggle({ panel, direction, label, className, onToggle }: PanelToggleProps) {
  const { 
    toggleCollapsed, 
    isPanelVisible, 
    getPanelState, 
    getPanelCategory,
    visiblePanels
  } = usePanel();
  
  const isVisible = isPanelVisible(panel);
  const panelState = getPanelState(panel);
  const isCollapsed = panelState === 'collapsed';
  const isSidebar = getPanelCategory(panel) === 'sidebar';

  // For content panels, check if it's the only expanded content panel
  const isOnlyExpandedContentPanel = () => {
    // Sidebar panels are never the only expanded panel
    if (isSidebar) return false;
    
    // For content panels, check if it's the only expanded one
    if (!isCollapsed) {
      const expandedContentPanels = visiblePanels.filter(p => 
        getPanelCategory(p) === 'content' && 
        getPanelState(p) === 'expanded'
      );
      
      return expandedContentPanels.length === 1 && expandedContentPanels[0] === panel;
    }
    
    return false;
  };

  // Handle toggle button click
  const handleToggleClick = () => {
    if (isVisible && !isOnlyExpandedContentPanel()) {
      if (onToggle) {
        onToggle(!isCollapsed);
      } else {
        toggleCollapsed(panel);
      }
    }
  };

  const isDisabled = isOnlyExpandedContentPanel();
  const tooltipText = isDisabled 
    ? 'Cannot collapse the only visible chat panel'
    : isCollapsed ? 'Expand' : 'Collapse';

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div className="relative inline-block">
          <Button
            variant="ghost"
            size="icon"
            className={`size-8 rounded-md text-primary ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleToggleClick}
            disabled={isDisabled}
          >
            {direction === 'left' && (
              <PanelRightIcon className="size-5" />
            )}
            {direction === 'right' && (
              <PanelLeftIcon className="size-5" />
            )}
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent 
        side={direction === 'left' ? 'right' : 'left'} 
        className="text-xs"
      >
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
} 