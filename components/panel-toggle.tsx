'use client';

import { ChevronLeft, ChevronRight, PanelLeftIcon, PanelRightIcon } from 'lucide-react';
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
  const shouldShowToggle = () => {
    // Sidebar panels always show toggle
    if (isSidebar) return true;
    
    // For content panels, don't show toggle if it's the only expanded content panel
    if (!isCollapsed) {
      const expandedContentPanels = visiblePanels.filter(p => 
        getPanelCategory(p) === 'content' && 
        getPanelState(p) === 'expanded'
      );
      
      // If this is the only expanded content panel, hide the toggle
      if (expandedContentPanels.length === 1 && expandedContentPanels[0] === panel) {
        return false;
      }
    }
    
    return true;
  };
  
  // Hide toggle button if not needed
  if (!shouldShowToggle()) {
    return null;
  }

  // Handle toggle button click
  const handleToggleClick = () => {
    if (isVisible) {
      if (onToggle) {
        onToggle(!isCollapsed);
      } else {
        toggleCollapsed(panel);
      }
    }
  };

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`size-8 rounded-md text-primary ${className}`}
          onClick={handleToggleClick}
        >
          {direction === 'left' && (
            isCollapsed ? (
              <PanelRightIcon className="size-5" />
            ) : (
              <ChevronLeft className="size-5" />
            )
          )}
          {direction === 'right' && (
            isCollapsed ? (
              <PanelLeftIcon className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={direction === 'left' ? 'right' : 'left'} className="text-xs">
        {isCollapsed ? `Expand` : `Collapse`}
      </TooltipContent>
    </Tooltip>
  );
} 