'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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
};

// Helper to categorize panels
function getPanelCategory(panel: PanelType): PanelCategory {
  return panel.includes('sidebar') ? 'sidebar' : 'content';
}

// All possible panels in the application
const ALL_PANELS: PanelType[] = ['chat-sidebar', 'chat', 'threads-sidebar', 'thread-chat'];

const PanelContext = createContext<PanelContextType | null>(null);

export function PanelProvider({ children }: { children: ReactNode }) {
  // By default, show all four panels - each sidebar is expanded, content panels collapsed
  const [visiblePanels, setVisiblePanels] = useState<PanelType[]>(ALL_PANELS);
  
  const [panelStates, setPanelStates] = useState<Record<PanelType, PanelState>>({
    'chat-sidebar': 'expanded',
    'chat': 'expanded',
    'threads-sidebar': 'collapsed',
    'thread-chat': 'collapsed'
  });

  // Debug output to console
  useEffect(() => {
    console.log('Visible panels:', visiblePanels);
    console.log('Panel states:', panelStates);
  }, [visiblePanels, panelStates]);

  // Ensure at least one content panel is always expanded
  useEffect(() => {
    const expandedContentPanels = visiblePanels.filter(panel => {
      const isContent = getPanelCategory(panel) === 'content';
      const isExpanded = panelStates[panel] === 'expanded';
      return isContent && isExpanded;
    });
    
    // If no content panels are expanded, expand the chat panel as default
    if (expandedContentPanels.length === 0) {
      console.log('No content panels expanded, expanding chat panel');
      
      setPanelStates(prev => ({
        ...prev,
        'chat': 'expanded'
      }));
    }
  }, [visiblePanels, panelStates]);

  // Always keep all panels visible
  useEffect(() => {
    // Ensure all panels are in the visible panels array
    const missingPanels = ALL_PANELS.filter(panel => !visiblePanels.includes(panel));
    
    if (missingPanels.length > 0) {
      setVisiblePanels(prev => [...prev, ...missingPanels]);
      
      // Set any newly added panels to collapsed state
      setPanelStates(prev => {
        const newStates = { ...prev };
        missingPanels.forEach(panel => {
          newStates[panel] = 'collapsed';
        });
        return newStates;
      });
    }
  }, [visiblePanels]);

  // Listen for show-thread-panels events to show thread panels
  useEffect(() => {
    const handleShowThreadPanels = (event: Event) => {
      const customEvent = event as CustomEvent;
      const threadId = customEvent.detail?.threadId;
      
      console.log('Showing thread panels for thread:', threadId);
      
      // Ensure both thread panels are visible and expanded
      setVisiblePanels(prev => {
        const newPanels = [...prev];
        if (!newPanels.includes('threads-sidebar')) newPanels.push('threads-sidebar');
        if (!newPanels.includes('thread-chat')) newPanels.push('thread-chat');
        return newPanels;
      });
      
      // Make both thread panels expanded
      setPanelStates(prevStates => ({
        ...prevStates,
        'threads-sidebar': 'expanded',
        'thread-chat': 'expanded',
        // Collapse chat panel to make room but keep chat-sidebar as is
        'chat': 'collapsed',
      }));
    };
    
    window.addEventListener('show-thread-panels', handleShowThreadPanels);
    
    return () => {
      window.removeEventListener('show-thread-panels', handleShowThreadPanels);
    };
  }, []);

  // Function to toggle a panel's visibility (show/hide)
  const togglePanel = (panel: PanelType) => {
    console.log(`Toggling panel ${panel} visibility`);
    
    // We don't actually hide panels anymore, just collapse them
    if (visiblePanels.includes(panel)) {
      toggleCollapsed(panel);
    } else {
      // If panel not visible, add it and set to expanded
      setVisiblePanels(prev => [...prev, panel]);
      setPanelStates(prevStates => ({
        ...prevStates,
        [panel]: 'expanded'
      }));
    }
  };

  // Function to toggle a panel's collapsed state
  const toggleCollapsed = (panel: PanelType) => {
    console.log(`Toggling panel ${panel} collapsed state`, {
      currentState: panelStates[panel],
      allPanelStates: { ...panelStates }
    });
    
    // Special handling for content panels - ensure at least one is expanded
    if (getPanelCategory(panel) === 'content' && panelStates[panel] === 'expanded') {
      // Check if there's another expanded content panel before allowing this one to collapse
      const otherContentPanels = ALL_PANELS.filter(p => 
        getPanelCategory(p) === 'content' && p !== panel
      );
      
      const anotherContentPanelExpanded = otherContentPanels.some(p => 
        visiblePanels.includes(p) && panelStates[p] === 'expanded'
      );
      
      // If no other content panel is expanded, don't allow this one to collapse
      if (!anotherContentPanelExpanded) {
        console.log(`Cannot collapse ${panel} because it's the only expanded content panel`);
        return;
      }
    }
    
    // Set the new state - always create a new object first
    setPanelStates(prev => {
      // Determine the new panel state
      const newPanelState: PanelState = prev[panel] === 'expanded' ? 'collapsed' : 'expanded';
      
      console.log(`${prev[panel] === 'expanded' ? 'Collapsing' : 'Expanding'} panel ${panel}`);
      
      // Create a completely new state object
      const newState = { ...prev, [panel]: newPanelState };
      
      return newState;
    });
  };

  // Function to directly set a panel's state (expanded or collapsed)
  const setPanelState = (panel: PanelType, state: PanelState) => {
    console.log(`Directly setting panel ${panel} to ${state}`, {
      currentState: panelStates[panel],
      requestedState: state
    });
    
    // Don't allow setting content panels to collapsed if they're the only expanded one
    if (state === 'collapsed' && getPanelCategory(panel) === 'content' && panelStates[panel] === 'expanded') {
      const otherContentPanels = ALL_PANELS.filter(p => 
        getPanelCategory(p) === 'content' && p !== panel
      );
      
      const anotherContentPanelExpanded = otherContentPanels.some(p => 
        visiblePanels.includes(p) && panelStates[p] === 'expanded'
      );
      
      if (!anotherContentPanelExpanded) {
        console.log(`Cannot set ${panel} to collapsed because it's the only expanded content panel`);
        return;
      }
    }
    
    // Update the panel state
    setPanelStates(prev => {
      // No-op if state is the same
      if (prev[panel] === state) {
        console.log(`State is already ${state}, no update needed`);
        return prev;
      }
      
      console.log(`Updating panel state for ${panel} from ${prev[panel]} to ${state}`);
      
      // Create a completely new state object
      return { ...prev, [panel]: state };
    });

    // If panel was hidden but now expanded or collapsed, also add it to visible panels
    if (!visiblePanels.includes(panel)) {
      setVisiblePanels(prev => [...prev, panel]);
    }
  };

  // Function to show a specific panel (and hide others if needed)
  const showPanel = (panel: PanelType) => {
    console.log(`Showing panel ${panel}`);
    
    // Special handling for thread-related panels
    if (panel === 'thread-chat' || panel === 'threads-sidebar') {
      // If showing thread-chat, also ensure threads-sidebar is visible (and vice versa)
      const otherThreadPanel = panel === 'thread-chat' ? 'threads-sidebar' : 'thread-chat';
      
      // Update panel states in a single operation
      setPanelStates(prevStates => ({
        ...prevStates,
        [panel]: 'expanded',
        [otherThreadPanel]: prevStates[otherThreadPanel], // Keep other panel's state
        'chat': 'collapsed', // Collapse chat panel to make room
      }));
      
      // Ensure both panels are visible
      setVisiblePanels(prev => {
        const newPanels = Array.from(new Set([...prev, panel, otherThreadPanel])) as PanelType[];
        return newPanels;
      });
      
      return;
    }
    
    // Normal behavior for non-thread panels
    setVisiblePanels(prev => {
      // If panel is already visible, do nothing
      if (prev.includes(panel)) {
        // But ensure it's expanded
        setPanelStates(prevStates => ({
          ...prevStates,
          [panel]: 'expanded'
        }));
        return prev;
      }
      
      // Add the panel to visible panels
      return [...prev, panel];
    });
  };

  // Check if a panel is visible
  const isPanelVisible = (panel: PanelType) => {
    return visiblePanels.includes(panel);
  };

  // Get the current state of a panel
  const getPanelState = (panel: PanelType) => {
    return isPanelVisible(panel) ? panelStates[panel] : 'hidden';
  };

  // Debug panel states whenever they change - simplified
  useEffect(() => {
    console.log('Panel states:', { ...panelStates });
  }, [panelStates]);
  
  // Debug visible panels whenever they change - simplified
  useEffect(() => {
    console.log('Visible panels:', [...visiblePanels]);
  }, [visiblePanels]);

  return (
    <PanelContext.Provider
      value={{
        visiblePanels,
        panelStates,
        togglePanel,
        toggleCollapsed,
        setPanelState,
        showPanel,
        isPanelVisible,
        getPanelState,
        allPanels: ALL_PANELS,
        getPanelCategory
      }}
    >
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