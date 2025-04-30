'use client';

import { PanelLeftIcon, PanelRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelType, usePanel } from '@/lib/panel-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMemo } from 'react';

interface PanelToggleProps {
  panel: PanelType;
  direction: 'left' | 'right';
  label: string;
  className?: string;
  onToggle?: (expanded: boolean) => void;
  hidden?: boolean;
}

export function PanelToggle({ panel, direction, label, className, onToggle, hidden }: PanelToggleProps) {
  const { 
    toggleCollapsed, 
    isPanelVisible, 
    getPanelState, 
    getPanelCategory,
    visiblePanels,
    isMobile,
    activeMobilePanel,
    showPanel
  } = usePanel();
  
  const isVisible = isPanelVisible(panel);
  const panelState = getPanelState(panel);
  const isCollapsed = panelState === 'collapsed';
  const isSidebar = getPanelCategory(panel) === 'sidebar';

  // Memoize the expanded content panel check to prevent unnecessary recalculations
  const isOnlyExpandedContentPanel = useMemo(() => {
    // Sidebar panels are never the only expanded panel
    if (isSidebar) return false;
    
    // For content panels in mobile, just check if it's active
    if (isMobile) return activeMobilePanel === panel;
    
    // For content panels in desktop, check if it's the only expanded one
    if (!isCollapsed) {
      const expandedContentPanels = visiblePanels.filter(p => 
        getPanelCategory(p) === 'content' && 
        getPanelState(p) === 'expanded'
      );
      
      return expandedContentPanels.length === 1 && expandedContentPanels[0] === panel;
    }
    
    return false;
  }, [isSidebar, isMobile, activeMobilePanel, panel, isCollapsed, visiblePanels, getPanelCategory, getPanelState]);

  // If hidden prop is true, don't render anything
  if (hidden) return null;

  // Handle toggle button click
  const handleToggleClick = () => {
    if (!isVisible) return;
    
    if (onToggle) {
      onToggle(!isCollapsed);
    } else if (isMobile) {
      // In mobile, only change panel if it's not already active
      if (activeMobilePanel !== panel) {
        showPanel(panel);
      }
    } else {
      toggleCollapsed(panel);
    }
  };

  // Disable toggle when it's the active panel on mobile
  const isDisabled = (isMobile && activeMobilePanel === panel) || (!isMobile && isOnlyExpandedContentPanel);
  const tooltipText = isDisabled 
    ? isMobile ? 'Cannot collapse the active panel on mobile' : 'Cannot collapse the only visible chat panel'
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
            {direction === 'left' ? (
              <PanelRightIcon className="size-5" />
            ) : (
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