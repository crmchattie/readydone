'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import * as React from 'react';

// Define the different panel types
export type PanelType = 'chat-sidebar' | 'chat' | 'threads-sidebar' | 'thread-chat';

// Define panel states
export type PanelState = 'expanded' | 'collapsed' | 'hidden';

// Define panel category to distinguish sidebars from content panels
export type PanelCategory = 'sidebar' | 'content';

type PanelContextType = {
  // The currently visible panels and their states
  visiblePanels: PanelType[];
  // Panel states map
  panelStates: Record<PanelType, PanelState>;
  // Function to toggle a panel's visibility
  togglePanel: (panel: PanelType) => void;
  // Function to toggle a panel's collapsed state
  toggleCollapsed: (panel: PanelType) => void;
  // Function to directly set a panel's state
  setPanelState: (panel: PanelType, state: PanelState) => void;
  // Function to show a specific panel (and hide others if needed)
  showPanel: (panel: PanelType) => void;
  // Check if a panel is visible (either expanded or collapsed)
  isPanelVisible: (panel: PanelType) => boolean;
  // Get the current state of a panel
  getPanelState: (panel: PanelType) => PanelState;
  // List of all panel types
  allPanels: PanelType[];
  // Function to determine if a panel is a sidebar
  getPanelCategory: (panel: PanelType) => PanelCategory;
  // Mobile-specific properties
  isMobile: boolean;
  activeMobilePanel: PanelType | null;
};

// Helper to categorize panels
function getPanelCategory(panel: PanelType): PanelCategory {
  return panel.includes('sidebar') ? 'sidebar' : 'content';
}

// All possible panels in the application
const ALL_PANELS: PanelType[] = ['chat-sidebar', 'chat', 'threads-sidebar', 'thread-chat'];

const PanelContext = createContext<PanelContextType | null>(null);

export function PanelProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [activeMobilePanel, setActiveMobilePanel] = useState<PanelType | null>(null);
  const [panelStates, setPanelStates] = useState<Record<PanelType, PanelState>>({
    'chat-sidebar': 'expanded',
    'chat': 'expanded',
    'threads-sidebar': 'collapsed',
    'thread-chat': 'collapsed'
  });
  
  // Derive effective panel states based on mobile/desktop mode
  const effectivePanelStates = React.useMemo(() => {
    if (!isMobile) return panelStates;
    
    // In mobile, all panels are collapsed except the active one
    return ALL_PANELS.reduce((acc, panel) => ({
      ...acc,
      [panel]: panel === activeMobilePanel ? 'expanded' : 'collapsed'
    }), {} as Record<PanelType, PanelState>);
  }, [isMobile, activeMobilePanel, panelStates]);

  // Handle transition between mobile and desktop
  useEffect(() => {
    if (isMobile && activeMobilePanel === null) {
      // Only set to chat if no panel is currently active
      setActiveMobilePanel('chat');
    }
  }, [isMobile, activeMobilePanel]);

  // Modified showPanel function to handle mobile
  const showPanel = React.useCallback((panel: PanelType) => {
    if (isMobile) {
      // In mobile, showing a panel makes it the active panel
      // Only update if it's different from current active panel
      if (activeMobilePanel !== panel) {
        setActiveMobilePanel(panel);
      }
    } else {
      // Existing desktop behavior
      setPanelStates(prevStates => {
        // No-op if panel is already expanded
        if (prevStates[panel] === 'expanded') {
          return prevStates;
        }
        
        return {
          ...prevStates,
          [panel]: 'expanded'
        };
      });
    }
  }, [isMobile, activeMobilePanel]);

  // Modified toggleCollapsed for mobile
  const toggleCollapsed = React.useCallback((panel: PanelType) => {
    if (isMobile) {
      // In mobile, toggling works like showing/hiding
      if (activeMobilePanel !== panel) {
        setActiveMobilePanel(panel);
      }
    } else {
      // Existing desktop behavior
      setPanelStates(prev => {
        const newPanelState: PanelState = prev[panel] === 'expanded' ? 'collapsed' : 'expanded';
        
        // Prevent collapsing the last expanded content panel
        if (newPanelState === 'collapsed' && getPanelCategory(panel) === 'content') {
          const expandedContentPanels = ALL_PANELS.filter(p => 
            getPanelCategory(p) === 'content' && 
            (p === panel ? newPanelState : prev[p]) === 'expanded'
          );
          
          if (expandedContentPanels.length === 0) {
            return prev;
          }
        }
        
        return { ...prev, [panel]: newPanelState };
      });
    }
  }, [isMobile, activeMobilePanel]);

  // Keep all panels in visiblePanels array
  const [visiblePanels] = useState<PanelType[]>(ALL_PANELS);

  // Add back togglePanel function
  const togglePanel = React.useCallback((panel: PanelType) => {
    toggleCollapsed(panel);
  }, [toggleCollapsed]);

  // Add back setPanelState function
  const setPanelState = React.useCallback((panel: PanelType, state: PanelState) => {
    setPanelStates(prev => ({ ...prev, [panel]: state }));
  }, []);

  // Check if a panel is visible
  const isPanelVisible = React.useCallback((panel: PanelType) => {
    return visiblePanels.includes(panel);
  }, [visiblePanels]);

  // Get the current state of a panel
  const getPanelState = React.useCallback((panel: PanelType) => {
    return effectivePanelStates[panel] || 'hidden';
  }, [effectivePanelStates]);

  const contextValue = React.useMemo<PanelContextType>(
    () => ({
      visiblePanels,
      panelStates: effectivePanelStates,
      togglePanel,
      toggleCollapsed,
      setPanelState,
      showPanel,
      isPanelVisible,
      getPanelState,
      allPanels: ALL_PANELS,
      getPanelCategory,
      isMobile,
      activeMobilePanel,
    }),
    [
      visiblePanels,
      effectivePanelStates,
      toggleCollapsed,
      showPanel,
      isPanelVisible,
      getPanelState,
      isMobile,
      activeMobilePanel,
      setPanelState,
      togglePanel
    ]
  );

  return (
    <PanelContext.Provider value={contextValue}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('usePanel must be used within a PanelProvider');
  }
  return context;
} 